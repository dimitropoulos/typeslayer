use std::collections::HashMap;

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
            panic!("LayerCake precedence must contain exactly 3 unique sources (Env, Flag, File)");
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
    pub fn load_config_in_dir(&mut self, dir: &str) {
        let path = std::path::Path::new(dir).join(&self.config_filename);
        self.cfg = std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| toml::from_str::<toml::Value>(&s).ok());
    }

    /// Parse CLI args into a simple flag map supporting `--name=value` and `--name value`.
    fn parse_flags() -> HashMap<String, String> {
        let mut map = HashMap::new();
        let mut prev_flag: Option<String> = None;
        for arg in std::env::args() {
            if let Some(flag) = prev_flag.take() {
                // treat current arg as value for previous flag
                map.insert(flag, arg);
                continue;
            }
            if let Some(stripped) = arg.strip_prefix("--") {
                if let Some(eq) = stripped.find('=') {
                    let (name, value) = stripped.split_at(eq);
                    map.insert(
                        format!("--{}", name),
                        value.trim_start_matches('=').to_string(),
                    );
                } else {
                    prev_flag = Some(format!("--{}", stripped));
                }
            }
        }
        map
    }

    /// Resolve a string using named arguments only.
    /// Validate returns Result<String, String>: Ok(transformed_value) or Err(message) which panics.
    pub fn resolve_string<F, V>(&self, args: ResolveStringArgs<F, V>) -> String
    where
        F: FnOnce() -> String,
        V: Fn(&str) -> Result<String, String>,
    {
        if !args.flag.starts_with("--") {
            panic!("Flag '{}' must start with --", args.flag);
        }
        let env_key = if self.env_prefix.is_empty() {
            args.env.to_string()
        } else {
            format!("{}{}", self.env_prefix, args.env)
        };
        for src in &self.precedence {
            match src {
                Source::Env => {
                    if let Ok(v) = std::env::var(&env_key) {
                        if !v.is_empty() {
                            match (args.validate)(&v) {
                                Ok(transformed) => {
                                    debug!(
                                        "resolved {}='{}' from env {}",
                                        args.env, transformed, env_key
                                    );
                                    return transformed;
                                }
                                Err(e) => {
                                    panic!("Invalid {} from env {}: {}", args.env, env_key, e)
                                }
                            }
                        }
                    }
                }
                Source::Flag => {
                    if let Some(v) = self.flags.get(args.flag) {
                        match (args.validate)(v) {
                            Ok(transformed) => {
                                debug!(
                                    "resolved {}='{}' from flag {}",
                                    args.env, transformed, args.flag
                                );
                                return transformed;
                            }
                            Err(e) => panic!("Invalid {} from flag {}: {}", args.env, args.flag, e),
                        }
                    }
                }
                Source::File => {
                    if let Some(v) = self.get_config_str(args.file) {
                        match (args.validate)(&v) {
                            Ok(transformed) => {
                                debug!(
                                    "resolved {}='{}' from file key {}",
                                    args.env, transformed, args.file
                                );
                                return transformed;
                            }
                            Err(e) => {
                                panic!("Invalid {} from file key {}: {}", args.env, args.file, e)
                            }
                        }
                    }
                }
            }
        }
        (args.default)()
    }

    /// Resolve a boolean using named arguments only.
    pub fn resolve_bool<F>(&self, args: ResolveBoolArgs<F>) -> bool
    where
        F: FnOnce() -> bool,
    {
        if !args.flag.starts_with("--") {
            panic!("Flag '{}' must start with --", args.flag);
        }
        let env_key = if self.env_prefix.is_empty() {
            args.env.to_string()
        } else {
            format!("{}{}", self.env_prefix, args.env)
        };
        for src in &self.precedence {
            match src {
                Source::Env => {
                    if let Ok(v) = std::env::var(&env_key) {
                        if let Some(b) = Self::parse_bool(&v) {
                            debug!("resolved bool {}={} from env {}", args.env, b, env_key);
                            return b;
                        }
                    }
                }
                Source::Flag => {
                    if let Some(v) = self.flags.get(args.flag) {
                        if let Some(b) = Self::parse_bool(v) {
                            debug!("resolved bool {}={} from flag {}", args.env, b, args.flag);
                            return b;
                        }
                    }
                }
                Source::File => {
                    if let Some(v) = self.get_config_bool(args.file) {
                        debug!(
                            "resolved bool {}={} from file key {}",
                            args.env, v, args.file
                        );
                        return v;
                    }
                }
            }
        }
        (args.default)()
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
