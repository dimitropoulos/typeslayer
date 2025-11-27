use crate::{
    analyze_trace::constants::ANALYZE_TRACE_FILENAME,
    cli::{resolve_path, resolve_string},
    files::TEMP_DIR_NAME,
    validate::{
        trace_json::{TRACE_JSON_FILENAME, parse_trace_json, read_trace_json},
        types_json::{
            TYPES_JSON_FILENAME, TypesJsonSchema, parse_types_json,
            validate_types_json as load_types_json,
        },
        utils::CPU_PROFILE_FILENAME,
    },
};
use serde_json::Value;
use std::collections::BTreeMap;
use std::fs;
use std::path::Path;
use std::process::Command;
use std::sync::Mutex;
use tauri::State;

pub struct AppData {
    pub project_root: String,
    pub temp_dir: String,
    pub types_json: TypesJsonSchema,
    pub trace_json: Vec<crate::validate::trace_json::TraceEvent>,
    pub analyze_trace: Option<crate::analyze_trace::AnalyzeTraceResult>,
    pub cpu_profile: Option<String>,
    pub package_scripts: BTreeMap<String, String>,
    pub typecheck_script_name: Option<String>,
    pub settings: Settings,
}

impl AppData {
    pub fn new() -> Self {
        let project_root = Self::init_project_root();
        let temp_dir = Self::init_temp_dir();
        let types_json = Self::init_types_json(&temp_dir, &project_root);
        let trace_json = Self::init_trace_json(&temp_dir, &project_root);
        let analyze_trace = Self::init_analyze_trace(&temp_dir);
        let cpu_profile = Self::init_cpu_profile(&temp_dir);

        let mut app = Self {
            project_root,
            temp_dir,
            types_json,
            trace_json,
            analyze_trace,
            cpu_profile,
            package_scripts: BTreeMap::new(),
            typecheck_script_name: None,
            settings: Settings::default(),
        };
        if app.load_package_json().is_ok() {
            app.typecheck_script_name = Self::init_typecheck_script_name(&app.package_scripts);
        }
        app
    }

    fn init_project_root() -> String {
        resolve_path("--project-root", "TYPESLAYER_PROJECT_ROOT", || {
            std::env::current_dir()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|_| "./".to_string())
        })
    }

    fn init_temp_dir() -> String {
        resolve_path("--temp-dir", "TYPESLAYER_TEMP_DIR", || {
            let sys_temp = std::env::temp_dir();
            sys_temp.join(TEMP_DIR_NAME).to_string_lossy().to_string()
        })
    }

    fn init_typecheck_script_name(scripts: &BTreeMap<String, String>) -> Option<String> {
        // Try CLI flag or env var first
        if let Some(candidate) = resolve_string(
            "--typecheck-script-name",
            "TYPESLAYER_TYPECHECK_SCRIPT_NAME",
        ) {
            if scripts.contains_key(&candidate) {
                return Some(candidate);
            }
            // If provided but not found, ignore and fall through to auto-detection
        }

        // Auto-detect based on precedence
        let precedence = [
            "type-check",
            "typecheck",
            "types-check",
            "typescheck",
            "check-type",
            "checktype",
            "check-types",
            "checktypes",
            "typescript",
        ];

        for name in precedence.iter() {
            if scripts.contains_key(*name) {
                return Some((*name).to_string());
            }
        }
        None
    }

    fn load_package_json(&mut self) -> Result<(), String> {
        let path = format!("{}package.json", self.project_root);
        let contents = fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read package.json at {path}: {e}"))?;
        let value: serde_json::Value = serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse package.json: {e}"))?;
        let scripts_obj = value
            .get("scripts")
            .and_then(|v| v.as_object())
            .ok_or_else(|| "package.json missing scripts field".to_string())?;
        self.package_scripts.clear();
        for (k, v) in scripts_obj.iter() {
            if let Some(cmd) = v.as_str() {
                self.package_scripts.insert(k.to_string(), cmd.to_string());
            }
        }
        Ok(())
    }

    fn auto_select_script(&mut self) {
        // Re-validate current selection or auto-detect
        if let Some(sel) = &self.typecheck_script_name {
            if self.package_scripts.contains_key(sel) {
                return;
            }
        }
        self.typecheck_script_name = Self::init_typecheck_script_name(&self.package_scripts);
    }

    pub fn update_project_root(&mut self, new_root: String) {
        self.project_root = new_root;
        // Remember the previously selected script name
        let previous_selection = self.typecheck_script_name.clone();
        self.package_scripts.clear();
        self.typecheck_script_name = None;
        if self.load_package_json().is_ok() {
            // If the user had a previous selection and it exists in the new package.json, keep it
            if let Some(prev) = previous_selection {
                if self.package_scripts.contains_key(&prev) {
                    self.typecheck_script_name = Some(prev);
                    return;
                }
            }
            // Otherwise, auto-detect
            self.auto_select_script();
        }
    }

    /// Parse environment variables from a command string
    /// Example: NODE_OPTIONS="--max-old-space-size=12288" tsc ...
    /// Returns: (Vec<(String, String)>, String) - env vars and cleaned command
    fn parse_env_vars(command: &str) -> (Vec<(String, String)>, String) {
        let mut env_vars = Vec::new();
        let mut remaining = command;

        // Match pattern: VAR_NAME="value" or VAR_NAME=value
        loop {
            let trimmed = remaining.trim_start();

            // Try to match VAR_NAME="value with spaces" pattern
            if let Some(eq_pos) = trimmed.find('=') {
                let potential_var = &trimmed[..eq_pos];

                // Check if it looks like an environment variable name (alphanumeric + underscore)
                if potential_var
                    .chars()
                    .all(|c| c.is_alphanumeric() || c == '_')
                {
                    let after_eq = &trimmed[eq_pos + 1..];

                    // Handle quoted values
                    if after_eq.starts_with('"') {
                        if let Some(close_quote) = after_eq[1..].find('"') {
                            let value = &after_eq[1..close_quote + 1];
                            env_vars.push((potential_var.to_string(), value.to_string()));
                            remaining = &after_eq[close_quote + 2..];
                            continue;
                        }
                    }
                    // Handle unquoted values (up to first space)
                    else if let Some(space_pos) = after_eq.find(' ') {
                        let value = &after_eq[..space_pos];
                        env_vars.push((potential_var.to_string(), value.to_string()));
                        remaining = &after_eq[space_pos..];
                        continue;
                    }
                }
            }

            // No more env vars found
            break;
        }

        (env_vars, remaining.trim().to_string())
    }

    const COMMON_ADD_ONS: &'static str = " --incremental false --noErrorTruncation";

    // Blocking helper that does not borrow self; suitable for spawn_blocking
    fn run_typescript_with_flag_blocking(
        project_root: String,
        script_command: String,
        temp_dir: String,
        flag: String,
        context: &str,
    ) -> Result<(), String> {
        fs::create_dir_all(&temp_dir)
            .map_err(|e| format!("Failed to create temp directory: {e}"))?;

        // Parse environment variables from the script command
        let (env_vars, clean_command) = Self::parse_env_vars(&script_command);

        let full_command = format!(
            "{script}{addons}{flag}",
            script = clean_command,
            addons = Self::COMMON_ADD_ONS,
            flag = flag
        );
        let npm_command = format!("npm exec -- {full_command}");
        let cwd = project_root.trim_end_matches('/').to_string();

        println!("Executing command: {}", npm_command);
        println!("Working directory: {}", cwd);

        let mut cmd = Command::new("sh");
        cmd.arg("-c").arg(&npm_command).current_dir(&cwd);

        // Set parsed environment variables
        for (key, value) in env_vars {
            cmd.env(key, value);
        }

        let output = cmd
            .output()
            .map_err(|e| format!("Failed to execute command: {e}"))?;

        if !output.status.success() {
            let stderr_raw = String::from_utf8_lossy(&output.stderr);
            // Filter out all npm WARN lines (non-fatal)
            let mut fatal_lines = Vec::new();
            for line in stderr_raw.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }
                let lower = trimmed.to_ascii_lowercase();
                let is_non_fatal = lower.starts_with("npm warn");
                if !is_non_fatal {
                    fatal_lines.push(trimmed.to_string());
                }
            }
            if !fatal_lines.is_empty() {
                let joined = fatal_lines.join("\n");
                return Err(format!("{context} failed: {joined}"));
            }
        } else {
            println!("Command completed successfully: {}", context);
        }
        Ok(())
    }

    // Async helper to validate outputs in temp_dir and return parsed results
    async fn validate_types_and_trace_async(
        temp_dir: &str,
    ) -> Result<
        (
            TypesJsonSchema,
            Vec<crate::validate::trace_json::TraceEvent>,
        ),
        String,
    > {
        let types_path = format!("{}{}", temp_dir, TYPES_JSON_FILENAME);
        let trace_path = format!("{}{}", temp_dir, TRACE_JSON_FILENAME);

        // Read/parse concurrently
        let (types_res, trace_res) =
            tokio::join!(load_types_json(types_path), read_trace_json(&trace_path));

        let types = types_res.map_err(|e| format!("types.json validation failed: {e}"))?;
        let trace = trace_res.map_err(|e| format!("trace.json validation failed: {e}"))?;

        Ok((types, trace))
    }

    fn init_types_json(temp_dir: &str, project_root: &str) -> TypesJsonSchema {
        let type_paths = [
            format!("{}{}", temp_dir, TYPES_JSON_FILENAME),
            format!("{}{}", project_root, TYPES_JSON_FILENAME),
        ];
        for p in type_paths.iter() {
            if Path::new(p).exists() {
                match std::fs::read_to_string(p)
                    .map_err(|e| e.to_string())
                    .and_then(|s| parse_types_json(p, &s))
                {
                    Ok(parsed) => return parsed,
                    Err(e) => println!("Startup types.json ingestion failed at {p}: {e}"),
                }
            }
        }
        Vec::new()
    }

    fn init_trace_json(
        temp_dir: &str,
        project_root: &str,
    ) -> Vec<crate::validate::trace_json::TraceEvent> {
        let trace_paths = [
            format!("{}{}", temp_dir, TRACE_JSON_FILENAME),
            format!("{}{}", project_root, TRACE_JSON_FILENAME),
        ];
        for p in trace_paths.iter() {
            if Path::new(p).exists() {
                match std::fs::read_to_string(p)
                    .map_err(|e| e.to_string())
                    .and_then(|s| parse_trace_json(p, &s))
                {
                    Ok(parsed) => return parsed,
                    Err(e) => println!("Startup trace.json ingestion failed at {p}: {e}"),
                }
            }
        }
        Vec::new()
    }

    fn init_analyze_trace(temp_dir: &str) -> Option<crate::analyze_trace::AnalyzeTraceResult> {
        let analyze_path = Path::new(temp_dir).join(ANALYZE_TRACE_FILENAME);
        if analyze_path.exists() {
            match std::fs::read_to_string(&analyze_path)
                .map_err(|e| e.to_string())
                .and_then(|s| {
                    serde_json::from_str::<crate::analyze_trace::AnalyzeTraceResult>(&s)
                        .map_err(|e| e.to_string())
                }) {
                Ok(parsed) => return Some(parsed),
                Err(e) => println!(
                    "Startup analyze-trace ingestion failed at {}: {}",
                    analyze_path.display(),
                    e
                ),
            }
        }
        None
    }

    fn init_cpu_profile(temp_dir: &str) -> Option<String> {
        let cpu_profile_path = Path::new(temp_dir).join(CPU_PROFILE_FILENAME);
        if cpu_profile_path.exists() {
            match std::fs::read_to_string(&cpu_profile_path) {
                Ok(contents) => return Some(contents),
                Err(e) => println!(
                    "Startup CPU profile ingestion failed at {}: {}",
                    cpu_profile_path.display(),
                    e
                ),
            }
        }
        None
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct Settings {
    pub simplify_paths: bool,
    pub prefer_editor_open: bool,
    pub available_editors: Vec<(String, String)>,
    pub preferred_editor: Option<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            simplify_paths: false,
            prefer_editor_open: true,
            available_editors: vec![
                ("code".to_string(), "VS Code".to_string()),
                ("cursor".to_string(), "Cursor".to_string()),
                ("zed".to_string(), "Zed".to_string()),
                ("nvim".to_string(), "Neovim".to_string()),
                ("vim".to_string(), "Vim".to_string()),
                ("ag".to_string(), "Antigravity".to_string()),
                ("idea".to_string(), "IntelliJ IDEA".to_string()),
                ("pycharm".to_string(), "PyCharm".to_string()),
                ("webstorm".to_string(), "WebStorm".to_string()),
                ("subl".to_string(), "Sublime Text".to_string()),
                ("emacs".to_string(), "Emacs".to_string()),
                ("nano".to_string(), "Nano".to_string()),
                ("hx".to_string(), "Helix".to_string()),
                ("lapce".to_string(), "Lapce".to_string()),
                ("lite-xl".to_string(), "Lite XL".to_string()),
            ],
            preferred_editor: None,
        }
    }
}

#[tauri::command]
pub async fn validate_types_json(
    state: State<'_, Mutex<AppData>>,
) -> Result<TypesJsonSchema, String> {
    let temp_dir = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.temp_dir.clone()
    };
    let path = format!("{}{}", temp_dir, TYPES_JSON_FILENAME);
    let result = load_types_json(path).await?;
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.types_json = result.clone();
    Ok(result)
}

#[tauri::command]
pub async fn validate_trace_json(
    state: State<'_, Mutex<AppData>>,
) -> Result<Vec<crate::validate::trace_json::TraceEvent>, String> {
    let temp_dir = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.temp_dir.clone()
    };
    let path = format!("{}{}", temp_dir, TRACE_JSON_FILENAME);
    let result = read_trace_json(&path).await?;
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.trace_json = result.clone();
    Ok(result)
}

#[tauri::command]
pub async fn get_trace_json(
    state: State<'_, Mutex<AppData>>,
) -> Result<Vec<crate::validate::trace_json::TraceEvent>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.trace_json.clone())
}

// Helper to extract numeric args field as f64 for limit sorting
fn extract_arg_number(event: &crate::validate::trace_json::TraceEvent, key: &str) -> f64 {
    if let serde_json::Value::Object(map) = &event.args {
        if let Some(serde_json::Value::Number(n)) = map.get(key) {
            return n.as_f64().unwrap_or(0.0);
        }
    }
    0.0
}

#[tauri::command]
pub async fn get_type_instantiation_limits(
    state: State<'_, Mutex<AppData>>,
) -> Result<Vec<crate::validate::trace_json::TraceEvent>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    let mut events: Vec<_> = data
        .trace_json
        .iter()
        .filter(|e| e.name == "instantiateType_DepthLimit")
        .cloned()
        .collect();
    events.sort_by(|a, b| {
        extract_arg_number(b, "instantiationCount")
            .partial_cmp(&extract_arg_number(a, "instantiationCount"))
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    Ok(events)
}

#[tauri::command]
pub async fn get_recursive_type_related_to_limits(
    state: State<'_, Mutex<AppData>>,
) -> Result<Vec<crate::validate::trace_json::TraceEvent>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    let mut events: Vec<_> = data
        .trace_json
        .iter()
        .filter(|e| e.name == "recursiveTypeRelatedTo_DepthLimit")
        .cloned()
        .collect();
    events.sort_by(|a, b| {
        extract_arg_number(b, "depth")
            .partial_cmp(&extract_arg_number(a, "depth"))
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    Ok(events)
}

#[tauri::command]
pub async fn get_type_related_to_discriminated_type_limits(
    state: State<'_, Mutex<AppData>>,
) -> Result<Vec<crate::validate::trace_json::TraceEvent>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    let mut events: Vec<_> = data
        .trace_json
        .iter()
        .filter(|e| e.name == "typeRelatedToDiscriminatedType_DepthLimit")
        .cloned()
        .collect();
    events.sort_by(|a, b| {
        extract_arg_number(b, "numCombinations")
            .partial_cmp(&extract_arg_number(a, "numCombinations"))
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    Ok(events)
}

#[tauri::command]
pub async fn get_types_json(state: State<'_, Mutex<AppData>>) -> Result<TypesJsonSchema, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.types_json.clone())
}

#[tauri::command]
pub async fn search_type(state: State<'_, Mutex<AppData>>, id: i64) -> Result<Value, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    // types_json contains ResolvedType; we return as JSON Value
    for t in &data.types_json {
        if t.id == id {
            return serde_json::to_value(t).map_err(|e| e.to_string());
        }
    }
    Err(format!("Type {id} not found"))
}

#[tauri::command]
pub async fn get_scripts(
    state: State<'_, Mutex<AppData>>,
) -> Result<BTreeMap<String, String>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.package_scripts.clone())
}

#[tauri::command]
pub async fn get_typecheck_script_name(
    state: State<'_, Mutex<AppData>>,
) -> Result<Option<String>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.typecheck_script_name.clone())
}

#[tauri::command]
pub async fn set_typecheck_script_name(
    state: State<'_, Mutex<AppData>>,
    script_name: String,
) -> Result<(), String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;
    if !data.package_scripts.contains_key(&script_name) {
        return Err(format!("Script {script_name} not found"));
    }
    data.typecheck_script_name = Some(script_name);
    Ok(())
}

#[tauri::command]
pub async fn generate_trace(state: State<'_, Mutex<AppData>>) -> Result<TypesJsonSchema, String> {
    // Short lock to get values we need
    let (script_command, temp_dir, project_root) = {
        let data = state.lock().map_err(|e| e.to_string())?;
        let script_name = data.typecheck_script_name.clone().ok_or_else(|| {
            "No script selected. Please select a type-check script first.".to_string()
        })?;
        let script_command = data
            .package_scripts
            .get(&script_name)
            .cloned()
            .ok_or_else(|| format!("Script {script_name} not found in package.json"))?;
        (
            script_command,
            data.temp_dir.clone(),
            data.project_root.clone(),
        )
    };

    let handle = tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let flag = format!(" --generateTrace {}", temp_dir);
        AppData::run_typescript_with_flag_blocking(
            project_root,
            script_command,
            temp_dir,
            flag,
            "TypeScript compilation with trace generation",
        )
    });

    match handle.await {
        Ok(Ok(())) => {
            // Now read/validate outputs asynchronously
            let temp_dir = {
                let data = state.lock().map_err(|e| e.to_string())?;
                data.temp_dir.clone()
            };
            let (types, trace) = AppData::validate_types_and_trace_async(&temp_dir).await?;
            let mut data = state.lock().map_err(|e| e.to_string())?;
            data.types_json = types.clone();
            data.trace_json = trace;
            Ok(types)
        }
        Ok(Err(e)) => Err(e),
        Err(e) => Err(format!("generate_trace join error: {}", e)),
    }
}

#[tauri::command]
pub async fn generate_cpu_profile(state: State<'_, Mutex<AppData>>) -> Result<(), String> {
    let (script_command, temp_dir, project_root) = {
        let data = state.lock().map_err(|e| e.to_string())?;
        let script_name = data.typecheck_script_name.clone().ok_or_else(|| {
            "No script selected. Please select a type-check script first.".to_string()
        })?;
        let script_command = data
            .package_scripts
            .get(&script_name)
            .cloned()
            .ok_or_else(|| format!("Script {script_name} not found in package.json"))?;
        (
            script_command,
            data.temp_dir.clone(),
            data.project_root.clone(),
        )
    };

    let handle = tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let flag = format!(
            " --generateCpuProfile {}/{}",
            temp_dir, CPU_PROFILE_FILENAME
        );
        AppData::run_typescript_with_flag_blocking(
            project_root,
            script_command,
            temp_dir,
            flag,
            "TypeScript CPU profile run",
        )
    });

    match handle.await {
        Ok(r) => {
            // On success, read and cache CPU profile contents
            if r.is_ok() {
                let temp_dir = {
                    let data = state.lock().map_err(|e| e.to_string())?;
                    data.temp_dir.clone()
                };
                let path = Path::new(&temp_dir).join(CPU_PROFILE_FILENAME);
                match tokio::fs::read_to_string(&path).await {
                    Ok(contents) => {
                        let mut data = state.lock().map_err(|e| e.to_string())?;
                        data.cpu_profile = Some(contents);
                    }
                    Err(e) => eprintln!("Failed to read CPU profile after generation: {}", e),
                }
            }
            r
        }
        Err(e) => Err(format!("generate_cpu_profile join error: {}", e)),
    }
}

#[tauri::command]
pub async fn analyze_trace_command(
    state: State<'_, Mutex<AppData>>,
    options: Option<crate::analyze_trace::AnalyzeTraceOptions>,
) -> Result<crate::analyze_trace::AnalyzeTraceResult, String> {
    println!("Starting analyze trace...");
    let temp_dir = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.temp_dir.clone()
    };

    let handle = tauri::async_runtime::spawn_blocking(move || {
        match crate::analyze_trace::analyze_trace(&temp_dir, options) {
            Ok(result) => {
                println!("Analyze trace completed successfully");
                Ok::<crate::analyze_trace::AnalyzeTraceResult, String>(result)
            }
            Err(e) => {
                eprintln!("Analyze trace failed: {}", e);
                Err(e)
            }
        }
    });

    match handle.await {
        Ok(r) => r,
        Err(e) => Err(format!("analyze_trace_command join error: {}", e)),
    }
}

#[tauri::command]
pub async fn get_analyze_trace(
    state: State<'_, Mutex<AppData>>,
) -> Result<crate::analyze_trace::AnalyzeTraceResult, String> {
    // Serve cached value if present
    {
        let data = state.lock().map_err(|e| e.to_string())?;
        if let Some(result) = &data.analyze_trace {
            return Ok(result.clone());
        }
    }

    // Read from disk and cache
    let temp_dir = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.temp_dir.clone()
    };
    let path = Path::new(&temp_dir).join("analyze-trace.json");
    let contents = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
    let parsed: crate::analyze_trace::AnalyzeTraceResult = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))?;
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.analyze_trace = Some(parsed.clone());
    Ok(parsed)
}

#[tauri::command]
pub async fn get_cpu_profile(state: State<'_, Mutex<AppData>>) -> Result<Option<String>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.cpu_profile.clone())
}

#[tauri::command]
pub async fn verify_analyze_trace(state: State<'_, Mutex<AppData>>) -> Result<(), String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    match &data.analyze_trace {
        Some(v) => {
            let json = serde_json::to_string(v).map_err(|e| e.to_string())?;
            if json.trim().is_empty() {
                Err("analyze-trace appears empty".to_string())
            } else {
                Ok(())
            }
        }
        None => Err("analyze-trace not loaded".to_string()),
    }
}

#[tauri::command]
pub async fn verify_cpu_profile(state: State<'_, Mutex<AppData>>) -> Result<(), String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    match &data.cpu_profile {
        Some(contents) => {
            if contents.trim().is_empty() {
                Err("tsc.cpuprofile is empty".to_string())
            } else {
                Ok(())
            }
        }
        None => Err("tsc.cpuprofile not loaded".to_string()),
    }
}

#[tauri::command]
pub async fn get_types_json_text(state: State<'_, Mutex<AppData>>) -> Result<String, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    serde_json::to_string_pretty(&data.types_json).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_trace_json_text(state: State<'_, Mutex<AppData>>) -> Result<String, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    serde_json::to_string_pretty(&data.trace_json).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_analyze_trace_text(state: State<'_, Mutex<AppData>>) -> Result<String, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    match &data.analyze_trace {
        Some(v) => serde_json::to_string_pretty(v).map_err(|e| e.to_string()),
        None => Err("analyze-trace not loaded".to_string()),
    }
}

#[tauri::command]
pub async fn get_cpu_profile_text(state: State<'_, Mutex<AppData>>) -> Result<String, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    match &data.cpu_profile {
        Some(contents) => Ok(contents.clone()),
        None => Err("tsc.cpuprofile not loaded".to_string()),
    }
}

#[tauri::command]
pub async fn get_settings(state: State<'_, Mutex<AppData>>) -> Result<Settings, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.settings.clone())
}

#[tauri::command]
pub async fn set_settings(
    state: State<'_, Mutex<AppData>>,
    settings: Settings,
) -> Result<(), String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.settings = settings;
    Ok(())
}

#[tauri::command]
pub async fn open_file(state: State<'_, Mutex<AppData>>, path: String) -> Result<(), String> {
    // Extract settings without holding the lock during blocking operations.
    let (prefer_editor, preferred_editor, available_editors) = {
        let data = state.lock().map_err(|e| e.to_string())?;
        (
            data.settings.prefer_editor_open,
            data.settings.preferred_editor.clone(),
            data.settings.available_editors.clone(),
        )
    };

    let cli_or_env_editor = resolve_string("--editor", "TYPESLAYER_EDITOR");

    // Separate the file path from optional :line:char suffix for existence checks.
    let (file_path, _line_char_suffix) = {
        // Accept paths like /abs/path.ts:123:5
        let mut parts = path.split(':');
        let first = parts.next().unwrap_or("").to_string();
        (first, parts.collect::<Vec<_>>())
    };

    if file_path.is_empty() {
        return Err("Empty path".to_string());
    }
    if !std::path::Path::new(&file_path).exists() {
        return Err(format!("Path does not exist: {file_path}"));
    }

    let handle = tauri::async_runtime::spawn_blocking(move || {
        // Helper to test command availability.
        fn command_exists(cmd: &str) -> bool {
            Command::new("sh")
                .arg("-c")
                .arg(format!("command -v {cmd} >/dev/null 2>&1"))
                .status()
                .map(|s| s.success())
                .unwrap_or(false)
        }

        if prefer_editor {
            // Determine editor to use: CLI/env > preferred_editor > first available
            let editor_to_use = cli_or_env_editor
                .or(preferred_editor)
                .or_else(|| available_editors.first().map(|(cmd, _)| cmd.clone()));

            // Build list of editors to try
            let editors_to_try: Vec<String> = if let Some(ref editor) = editor_to_use {
                let mut eds = vec![editor.clone()];
                for (cmd, _label) in &available_editors {
                    if cmd != editor {
                        eds.push(cmd.clone());
                    }
                }
                eds
            } else {
                available_editors
                    .iter()
                    .map(|(cmd, _)| cmd.clone())
                    .collect()
            };

            // Try each editor in order
            for ed in editors_to_try.iter() {
                if !command_exists(ed) {
                    continue;
                }
                // VS Code supports --goto path:line:col; others we just pass file path.
                let attempt = if ed == "code" { &path } else { &file_path };
                let status = if ed == "code" {
                    Command::new(ed).arg("--goto").arg(attempt).status()
                } else {
                    Command::new(ed).arg(attempt).status()
                };
                match status {
                    Ok(s) if s.success() => return Ok(()),
                    _ => continue,
                }
            }
            // Fall through to system opener if editors failed.
        }

        // System fallback (xdg-open/open/start) to let OS decide.
        #[cfg(target_os = "linux")]
        let fallback_status = Command::new("xdg-open").arg(&file_path).status();
        #[cfg(target_os = "macos")]
        let fallback_status = Command::new("open").arg(&file_path).status();
        #[cfg(target_os = "windows")]
        let fallback_status = Command::new("cmd")
            .arg("/C")
            .arg("start")
            .arg("")
            .arg(&file_path)
            .status();

        match fallback_status {
            Ok(s) if s.success() => Ok(()),
            _ => Err("Failed to open file with any known method".to_string()),
        }
    });

    match handle.await {
        Ok(r) => r,
        Err(e) => Err(format!("open_file join error: {e}")),
    }
}

#[tauri::command]
pub async fn get_available_editors(
    state: State<'_, Mutex<AppData>>,
) -> Result<Vec<(String, String)>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.settings.available_editors.clone())
}

#[tauri::command]
pub async fn get_preferred_editor(
    state: State<'_, Mutex<AppData>>,
) -> Result<Option<String>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.settings.preferred_editor.clone())
}

#[tauri::command]
pub async fn set_preferred_editor(
    state: State<'_, Mutex<AppData>>,
    editor: String,
) -> Result<(), String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;

    // Validate that editor is in available_editors
    let is_valid = data
        .settings
        .available_editors
        .iter()
        .any(|(cmd, _)| cmd == &editor);

    if !is_valid {
        return Err(format!(
            "Editor '{}' is not in available editors list",
            editor
        ));
    }

    data.settings.preferred_editor = Some(editor);
    Ok(())
}
