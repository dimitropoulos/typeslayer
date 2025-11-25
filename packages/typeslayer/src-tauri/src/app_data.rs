use crate::{
    cli::{resolve_path, resolve_string},
    files::TEMP_DIR_NAME,
    validate::trace_json::{TRACE_JSON_FILENAME, read_trace_json},
    validate::types_json::{
        TYPES_JSON_FILENAME, TypesJsonSchema, validate_types_json as validate_types_json_inner,
    },
    validate::utils::CPU_PROFILE_FILENAME,
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
    pub package_scripts: BTreeMap<String, String>,
    pub typecheck_script_name: Option<String>,
}

impl AppData {
    pub fn new() -> Self {
        let mut app = Self {
            project_root: Self::init_project_root(),
            temp_dir: Self::init_temp_dir(),
            types_json: Vec::new(),
            trace_json: Vec::new(),
            package_scripts: BTreeMap::new(),
            typecheck_script_name: None,
        };
        if app.load_package_json().is_ok() {
            app.typecheck_script_name = Self::init_typecheck_script_name(&app.package_scripts);
        }
        app.ingest_existing_outputs();
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

    pub fn validate_types_json(&mut self) -> Result<TypesJsonSchema, String> {
        let path = format!("{}{}", self.temp_dir, TYPES_JSON_FILENAME);
        let result = validate_types_json_inner(path)?;
        // store the parsed vector on the struct before returning
        self.types_json = result.clone();
        Ok(result)
    }

    pub fn validate_trace_json(
        &mut self,
    ) -> Result<Vec<crate::validate::trace_json::TraceEvent>, String> {
        let path = format!("{}{}", self.temp_dir, TRACE_JSON_FILENAME);
        let result = read_trace_json(&path)?;
        self.trace_json = result.clone();
        Ok(result)
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
        self.package_scripts.clear();
        self.typecheck_script_name = None;
        if self.load_package_json().is_ok() {
            self.auto_select_script();
        }
    }
    const COMMON_ADD_ONS: &'static str = " --incremental false --noErrorTruncation";

    fn run_typescript_with_flag(&mut self, flag: String, context: &str) -> Result<(), String> {
        let script_name = self.typecheck_script_name.as_ref().ok_or_else(|| {
            "No script selected. Please select a type-check script first.".to_string()
        })?;
        let script_command = self
            .package_scripts
            .get(script_name)
            .ok_or_else(|| format!("Script {script_name} not found in package.json"))?;
        fs::create_dir_all(&self.temp_dir)
            .map_err(|e| format!("Failed to create temp directory: {e}"))?;
        let full_command = format!(
            "{script}{addons}{flag}",
            script = script_command,
            addons = Self::COMMON_ADD_ONS,
            flag = flag
        );
        let npm_command = format!("npm exec -- {full_command}");
        let cwd = self.project_root.trim_end_matches('/');

        println!("Executing command: {}", npm_command);
        println!("Working directory: {}", cwd);

        let output = Command::new("sh")
            .arg("-c")
            .arg(&npm_command)
            .current_dir(cwd)
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
                    fatal_lines.push(trimmed);
                }
            }
            if fatal_lines.is_empty() {
                // Treat as success with suppressed warnings
            } else {
                let joined = fatal_lines.join("\n");
                return Err(format!("{context} failed: {joined}"));
            }
        }
        Ok(())
    }

    pub fn generate_trace(&mut self) -> Result<(), String> {
        let flag = format!(" --generateTrace {}", self.temp_dir);
        self.run_typescript_with_flag(flag, "TypeScript compilation with trace generation")?;
        // Validate types.json first
        self.validate_types_json()
            .map_err(|e| format!("types.json validation failed: {e}"))?;
        // Then validate trace.json
        self.validate_trace_json()
            .map_err(|e| format!("trace.json validation failed: {e}"))?;
        Ok(())
    }

    pub fn generate_cpu_profile(&mut self) -> Result<(), String> {
        let flag = format!(
            " --generateCpuProfile {}/{}",
            self.temp_dir, CPU_PROFILE_FILENAME
        );
        self.run_typescript_with_flag(flag, "TypeScript CPU profile run")
    }

    fn ingest_existing_outputs(&mut self) {
        // Attempt to ingest existing types.json from temp_dir then project_root
        let type_paths = [
            format!("{}{}", self.temp_dir, TYPES_JSON_FILENAME),
            format!("{}{}", self.project_root, TYPES_JSON_FILENAME),
        ];
        for p in type_paths.iter() {
            if Path::new(p).exists() {
                match validate_types_json_inner(p.clone()) {
                    Ok(parsed) => {
                        self.types_json = parsed;
                        break;
                    }
                    Err(e) => println!("Startup types.json ingestion failed at {p}: {e}"),
                }
            }
        }
        // Attempt to ingest existing trace.json similarly
        let trace_paths = [
            format!("{}{}", self.temp_dir, TRACE_JSON_FILENAME),
            format!("{}{}", self.project_root, TRACE_JSON_FILENAME),
        ];
        for p in trace_paths.iter() {
            if Path::new(p).exists() {
                match read_trace_json(p) {
                    Ok(parsed) => {
                        self.trace_json = parsed;
                        break;
                    }
                    Err(e) => println!("Startup trace.json ingestion failed at {p}: {e}"),
                }
            }
        }
    }
}

#[tauri::command]
pub fn validate_types_json(state: State<'_, Mutex<AppData>>) -> Result<TypesJsonSchema, String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.validate_types_json()
}

#[tauri::command]
pub fn validate_trace_json(
    state: State<'_, Mutex<AppData>>,
) -> Result<Vec<crate::validate::trace_json::TraceEvent>, String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.validate_trace_json()
}

#[tauri::command]
pub fn get_trace_json(
    state: State<'_, Mutex<AppData>>,
) -> Result<Vec<crate::validate::trace_json::TraceEvent>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.trace_json.clone())
}

#[tauri::command]
pub fn get_types_json(state: State<'_, Mutex<AppData>>) -> Result<TypesJsonSchema, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.types_json.clone())
}

#[tauri::command]
pub fn search_type(state: State<'_, Mutex<AppData>>, id: i64) -> Result<Value, String> {
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
pub fn get_scripts(state: State<'_, Mutex<AppData>>) -> Result<BTreeMap<String, String>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.package_scripts.clone())
}

#[tauri::command]
pub fn get_typecheck_script_name(
    state: State<'_, Mutex<AppData>>,
) -> Result<Option<String>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.typecheck_script_name.clone())
}

#[tauri::command]
pub fn set_typecheck_script_name(
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
pub fn generate_trace(state: State<'_, Mutex<AppData>>) -> Result<TypesJsonSchema, String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.generate_trace()?;
    // Return the parsed types_json that was populated during generate_trace
    Ok(data.types_json.clone())
}

#[tauri::command]
pub fn generate_cpu_profile(state: State<'_, Mutex<AppData>>) -> Result<(), String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.generate_cpu_profile()
}
