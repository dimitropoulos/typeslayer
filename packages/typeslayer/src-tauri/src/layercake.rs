use std::collections::{HashMap, HashSet};

use tracing::debug;

/// Source precedence options for resolution.
#[derive(Clone, Debug)]
pub enum Source {
    Env,
    Flag,
    File,
}

/// A small helper to resolve settings by precedence across env vars, CLI flags, and a TOML config file.
#[derive(Clone, Debug)]
pub struct LayerCake {
    precedence: Vec<Source>,
    cfg: Option<toml::Value>,
    /// Cached CLI flags parsed as `--flag=value` or `--flag value`.
    flags: HashMap<String, String>,
    /// Environment variable prefix (empty string means no prefix)
    env_prefix: String,
    /// Stored config filename (e.g. "typeslayer.toml")
    config_filename: String,
}

/// Named-argument container for resolving strings.
pub struct ResolveStringArgs<'a, F, V>
where
    F: FnOnce() -> String,
    V: Fn(&str) -> Result<String, String>,
{
    pub env: &'a str,
    pub flag: &'a str,
    pub file: &'a str,
    pub default: F,
    pub validate: V,
}

/// Named-argument container for resolving numbers.
pub struct ResolveNumberArgs<'a, F, V>
where
    F: FnOnce() -> i32,
    V: Fn(&i32) -> Result<i32, String>,
{
    pub env: &'a str,
    pub flag: &'a str,
    pub file: &'a str,
    pub default: F,
    pub validate: V,
}

/// Named-argument container for resolving booleans.
pub struct ResolveBoolArgs<'a, F>
where
    F: FnOnce() -> bool,
{
    pub env: &'a str,
    pub flag: &'a str,
    pub file: &'a str,
    pub default: F,
}

/// Named-argument container for resolving arrays of strings.
pub struct ResolveArrayOfStringsArgs<'a, F, V>
where
    F: FnOnce() -> Vec<String>,
    V: Fn(&[String]) -> Result<Vec<String>, String>,
{
    pub env: &'a str,
    pub flag: &'a str,
    pub file: &'a str,
    pub default: F,
    pub validate: V,
}

/// Initialization arguments for LayerCake.
pub struct LayerCakeInitArgs<'a> {
    pub config_filename: &'a str,
    pub precedence: [Source; 3],
    pub env_prefix: &'a str, // empty string allowed for no prefix
}

impl LayerCake {
    /// Initialize with args struct; does not immediately load config file (only stores filename).
    /// Validates that precedence contains exactly 3 unique sources.
    pub fn new(args: LayerCakeInitArgs) -> Self {
        // Validate uniqueness of precedence entries
        let mut seen = std::collections::HashSet::new();
        for s in &args.precedence {
            seen.insert(std::mem::discriminant(s));
        }
        if seen.len() != 3 {
            panic!(
                "[layercake] precedence must contain exactly 3 unique sources (Env, Flag, File)"
            );
        }
        let flags = Self::parse_flags();
        Self {
            precedence: args.precedence.to_vec(),
            cfg: None,
            flags,
            env_prefix: args.env_prefix.to_string(),
            config_filename: args.config_filename.to_string(),
        }
    }

    /// Load or reload the TOML config by joining stored filename with provided directory.
    pub async fn load_config_in_dir(&mut self, dir: String) -> Result<(), String> {
        let config_filename = self.config_filename.clone();
        self.cfg = tauri::async_runtime::spawn_blocking(move || {
            let path = std::path::Path::new(&dir).join(config_filename);
            std::fs::read_to_string(&path)
                .ok()
                .and_then(|s| toml::from_str::<toml::Value>(&s).ok())
        })
        .await
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    /// Parse CLI args into a simple flag map supporting `--name=value`, `--name value`, and `--name` (implied "true").
    fn parse_flags() -> HashMap<String, String> {
        let mut map = HashMap::new();
        let mut prev_flag: Option<String> = None;
        for arg in std::env::args() {
            if let Some(flag) = prev_flag.take() {
                // If current arg is also a flag, the previous flag was boolean (no value)
                if arg.starts_with("--") {
                    map.insert(flag, "true".to_string());
                    // Now process current arg as a new flag
                    if let Some(stripped) = arg.strip_prefix("--") {
                        if let Some(eq) = stripped.find('=') {
                            let (name, value) = stripped.split_at(eq);
                            map.insert(
                                format!("--{name}"),
                                value.trim_start_matches('=').to_string(),
                            );
                        } else {
                            prev_flag = Some(format!("--{stripped}"));
                        }
                    }
                } else {
                    // treat current arg as value for previous flag
                    map.insert(flag, arg);
                }
                continue;
            }
            if let Some(stripped) = arg.strip_prefix("--") {
                if let Some(eq) = stripped.find('=') {
                    let (name, value) = stripped.split_at(eq);
                    map.insert(
                        format!("--{name}"),
                        value.trim_start_matches('=').to_string(),
                    );
                } else {
                    prev_flag = Some(format!("--{stripped}"));
                }
            }
        }
        // Handle case where last argument was a flag without value (implied "true")
        if let Some(flag) = prev_flag {
            map.insert(flag, "true".to_string());
        }
        map
    }

    /// Resolve a string using named arguments only.
    /// Validate returns Result<String, String>: Ok(validated_value) or Err(message) which panics.
    pub fn resolve_string<F, V>(&self, args: ResolveStringArgs<F, V>) -> String
    where
        F: FnOnce() -> String,
        V: Fn(&str) -> Result<String, String>,
    {
        if !args.flag.starts_with("--") {
            panic!("[layercake] Flag '{}' must start with --", args.flag);
        }
        let env_key = if self.env_prefix.is_empty() {
            args.env.to_string()
        } else {
            format!("{}{}", self.env_prefix, args.env)
        };
        for src in &self.precedence {
            match src {
                Source::Env => {
                    if let Ok(v) = std::env::var(&env_key)
                        && !v.is_empty()
                    {
                        match (args.validate)(&v) {
                            Ok(validated) => {
                                debug!(
                                    "[layercake] {} string resolved from env: {}='{}'",
                                    args.env, env_key, validated
                                );
                                return validated;
                            }
                            Err(e) => {
                                panic!(
                                    "[layercake] Invalid {} from env {}: {}",
                                    args.env, env_key, e
                                )
                            }
                        }
                    }
                }
                Source::Flag => {
                    if let Some(v) = self.flags.get(args.flag) {
                        match (args.validate)(v) {
                            Ok(validated) => {
                                debug!(
                                    "[layercake] {} string resolved from flag {}={}",
                                    args.env, args.flag, validated
                                );
                                return validated;
                            }
                            Err(e) => panic!(
                                "[layercake] Invalid {} from flag {}: {}",
                                args.env, args.flag, e
                            ),
                        }
                    }
                }
                Source::File => {
                    if let Some(v) = self.get_config_str(args.file) {
                        match (args.validate)(&v) {
                            Ok(validated) => {
                                debug!(
                                    "[layercake] {} string resolved from {} key {}: {}",
                                    args.env, self.config_filename, args.file, validated
                                );
                                return validated;
                            }
                            Err(e) => {
                                panic!(
                                    "[layercake] Invalid {} from file key {}: {}",
                                    args.env, args.file, e
                                )
                            }
                        }
                    }
                }
            }
        }
        let default = (args.default)();
        debug!(
            "[layercake] {} using default string '{}'",
            args.env, default
        );
        default
    }

    /// Resolve a number (i32) using named arguments only.
    /// Validate returns Result<i32, String>: Ok(validated_value) or Err(message) which panics.
    pub fn resolve_number<F, V>(&self, args: ResolveNumberArgs<F, V>) -> i32
    where
        F: FnOnce() -> i32,
        V: Fn(&i32) -> Result<i32, String>,
    {
        if !args.flag.starts_with("--") {
            panic!("[layercake] Flag '{}' must start with --", args.flag);
        }
        let env_key = if self.env_prefix.is_empty() {
            args.env.to_string()
        } else {
            format!("{}{}", self.env_prefix, args.env)
        };
        for src in &self.precedence {
            match src {
                Source::Env => {
                    if let Ok(v) = std::env::var(&env_key)
                        && !v.is_empty()
                    {
                        match v.parse::<i32>() {
                            Ok(parsed) => match (args.validate)(&parsed) {
                                Ok(validated) => {
                                    debug!(
                                        "[layercake] {} number resolved from env: {}={}",
                                        args.env, env_key, validated
                                    );
                                    return validated;
                                }
                                Err(e) => {
                                    panic!(
                                        "[layercake] Invalid {} from env {}: {}",
                                        args.env, env_key, e
                                    )
                                }
                            },
                            Err(e) => {
                                panic!(
                                    "[layercake] Failed to parse {} from env {}: {}",
                                    args.env, env_key, e
                                )
                            }
                        }
                    }
                }
                Source::Flag => {
                    if let Some(v) = self.flags.get(args.flag) {
                        match v.parse::<i32>() {
                            Ok(parsed) => match (args.validate)(&parsed) {
                                Ok(validated) => {
                                    debug!(
                                        "[layercake] {} number resolved from flag: {}={}",
                                        args.env, args.flag, validated
                                    );
                                    return validated;
                                }
                                Err(e) => {
                                    panic!(
                                        "[layercake] Invalid {} from flag {}: {}",
                                        args.env, args.flag, e
                                    )
                                }
                            },
                            Err(e) => {
                                panic!(
                                    "[layercake] Failed to parse {} from flag {}: {}",
                                    args.env, args.flag, e
                                )
                            }
                        }
                    }
                }
                Source::File => {
                    if let Some(v) = self.get_config_i32(args.file) {
                        match (args.validate)(&v) {
                            Ok(validated) => {
                                debug!(
                                    "[layercake] {} number resolved from {} key {}: {}",
                                    args.env, self.config_filename, args.file, validated
                                );
                                return validated;
                            }
                            Err(e) => {
                                panic!(
                                    "[layercake] Invalid {} from file key {}: {}",
                                    args.env, args.file, e
                                )
                            }
                        }
                    }
                }
            }
        }
        let default = (args.default)();
        debug!("[layercake] {} using default number {}", args.env, default);
        default
    }

    /// Resolve a boolean using named arguments only.
    pub fn resolve_bool<F>(&self, args: ResolveBoolArgs<F>) -> bool
    where
        F: FnOnce() -> bool,
    {
        if !args.flag.starts_with("--") {
            panic!("[layercake] Flag '{}' must start with --", args.flag);
        }
        let env_key = if self.env_prefix.is_empty() {
            args.env.to_string()
        } else {
            format!("{}{}", self.env_prefix, args.env)
        };
        for src in &self.precedence {
            match src {
                Source::Env => {
                    if let Ok(validated) = std::env::var(&env_key)
                        && let Some(b) = Self::parse_bool(&validated)
                    {
                        debug!(
                            "[layercake] {} boolean resolved from env: {}={}",
                            args.env, env_key, b
                        );
                        return b;
                    }
                }
                Source::Flag => {
                    if let Some(validated) = self.flags.get(args.flag)
                        && let Some(b) = Self::parse_bool(validated)
                    {
                        debug!(
                            "[layercake] {} boolean resolved from flag: {}={}",
                            args.env, args.flag, b
                        );
                        return b;
                    }
                }
                Source::File => {
                    if let Some(validated) = self.get_config_bool(args.file) {
                        debug!(
                            "[layercake] {} boolean resolved from {} key {}: {}",
                            args.env, self.config_filename, args.file, validated
                        );
                        return validated;
                    }
                }
            }
        }
        let default = (args.default)();

        debug!("[layercake] {} using default bool {}", args.env, default);
        default
    }

    /// Resolve a string array using named arguments only.
    pub fn resolve_array_of_strings<F, V>(
        &self,
        args: ResolveArrayOfStringsArgs<F, V>,
    ) -> Vec<String>
    where
        F: FnOnce() -> Vec<String>,
        V: Fn(&[String]) -> Result<Vec<String>, String>,
    {
        if !args.flag.starts_with("--") {
            panic!("[layercake] Flag '{}' must start with --", args.flag);
        }
        let env_key = if self.env_prefix.is_empty() {
            args.env.to_string()
        } else {
            format!("{}{}", self.env_prefix, args.env)
        };

        for src in &self.precedence {
            match src {
                Source::Env => {
                    if let Ok(v) = std::env::var(&env_key)
                        && !v.trim().is_empty()
                    {
                        let parsed = Self::parse_string_list(&v);
                        match (args.validate)(&parsed) {
                            Ok(validated) => {
                                debug!(
                                    "[layercake] {} string array resolved from env: {}={}",
                                    args.env,
                                    env_key,
                                    validated.join(",")
                                );
                                return validated;
                            }
                            Err(e) => {
                                panic!(
                                    "[layercake] Invalid {} from env {}: {}",
                                    args.env, env_key, e
                                )
                            }
                        }
                    }
                }
                Source::Flag => {
                    if let Some(v) = self.flags.get(args.flag)
                        && !v.trim().is_empty()
                    {
                        let parsed = Self::parse_string_list(v);
                        match (args.validate)(&parsed) {
                            Ok(validated) => {
                                debug!(
                                    "[layercake] {} string array resolved from flag: {}=[{}]",
                                    args.env,
                                    args.flag,
                                    validated.join(",")
                                );
                                return validated;
                            }
                            Err(e) => {
                                panic!(
                                    "[layercake] Invalid {} from flag {}: {}",
                                    args.env, args.flag, e
                                )
                            }
                        }
                    }
                }
                Source::File => {
                    if let Some(v) = self.get_config_array_of_strings(args.file) {
                        match (args.validate)(&v) {
                            Ok(validated) => {
                                debug!(
                                    "[layercake] {} string array resolved from file {} key {}: [{}]",
                                    args.env,
                                    self.config_filename,
                                    args.file,
                                    validated.join(",")
                                );
                                return validated;
                            }
                            Err(e) => {
                                panic!(
                                    "[layercake] Invalid {} from file key {}: {}",
                                    args.env, args.file, e
                                )
                            }
                        }
                    }
                }
            }
        }

        let default = (args.default)();
        debug!(
            "[layercake] {} using default array of strings {:?}",
            args.env, default
        );
        default
    }

    fn parse_bool(s: &str) -> Option<bool> {
        let lowered = s.trim().to_ascii_lowercase();
        if matches!(lowered.as_str(), "1" | "true" | "yes" | "on") {
            return Some(true);
        }
        if matches!(lowered.as_str(), "0" | "false" | "no" | "off") {
            return Some(false);
        }
        None
    }

    fn parse_string_list(raw: &str) -> Vec<String> {
        let mut result = Vec::new();
        let mut seen = HashSet::new();
        for item in raw.split(|c: char| c == ',' || c.is_whitespace()) {
            let trimmed = item.trim();
            if trimmed.is_empty() {
                continue;
            }
            if seen.insert(trimmed.to_string()) {
                result.push(trimmed.to_string());
            }
        }
        result
    }

    fn get_config_str(&self, key_path: &str) -> Option<String> {
        let mut cur = self.cfg.as_ref()?;
        for segment in key_path.split('.') {
            cur = cur.get(segment)?;
        }
        cur.as_str().map(|s| s.to_string())
    }

    fn get_config_bool(&self, key_path: &str) -> Option<bool> {
        let mut cur = self.cfg.as_ref()?;
        for segment in key_path.split('.') {
            cur = cur.get(segment)?;
        }
        cur.as_bool()
    }

    fn get_config_i32(&self, key_path: &str) -> Option<i32> {
        let mut cur = self.cfg.as_ref()?;
        for segment in key_path.split('.') {
            cur = cur.get(segment)?;
        }
        cur.as_integer().and_then(|i| i.try_into().ok())
    }

    fn get_config_array_of_strings(&self, key_path: &str) -> Option<Vec<String>> {
        let mut cur = self.cfg.as_ref()?;
        for segment in key_path.split('.') {
            cur = cur.get(segment)?;
        }
        let arr = cur.as_array()?;
        let mut out = Vec::with_capacity(arr.len());
        for v in arr {
            if let Some(s) = v.as_str() {
                out.push(s.to_string());
            } else {
                return None;
            }
        }
        Some(out)
    }

    /// Check whether a CLI flag was provided (e.g. `--project-root`).
    pub fn has_flag(&self, flag: &str) -> bool {
        self.flags.contains_key(flag)
    }

    /// Determine if the given env key (without prefix) is set to a non-empty value.
    pub fn has_env(&self, key: &str) -> bool {
        let env_key = if self.env_prefix.is_empty() {
            key.to_string()
        } else {
            format!("{}{}", self.env_prefix, key)
        };
        std::env::var(env_key)
            .map(|v| !v.trim().is_empty())
            .unwrap_or(false)
    }
}
