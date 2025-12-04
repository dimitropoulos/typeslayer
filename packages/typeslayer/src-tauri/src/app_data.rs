use crate::{
    analyze_trace::constants::ANALYZE_TRACE_FILENAME,
    layercake::{LayerCake, LayerCakeInitArgs, ResolveBoolArgs, ResolveStringArgs, Source},
    process_controller::ProcessController,
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
use std::fs;
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use tracing::{error, info};

// Static list of known editors (cmd, human-readable name)
const AVAILABLE_EDITORS: &[(&str, &str)] = &[
    ("code", "VS Code"),
    ("cursor", "Cursor"),
    ("zed", "Zed"),
    ("nvim", "Neovim"),
    ("vim", "Vim"),
    ("idea", "IntelliJ IDEA"),
    ("pycharm", "PyCharm"),
    ("webstorm", "WebStorm"),
    ("subl", "Sublime Text"),
    ("emacs", "Emacs"),
    ("nano", "Nano"),
    ("hx", "Helix"),
    ("lapce", "Lapce"),
    ("lite-xl", "Lite XL"),
];

pub struct AppData {
    pub project_root: String,
    pub types_json: TypesJsonSchema,
    pub trace_json: Vec<crate::validate::trace_json::TraceEvent>,
    pub analyze_trace: Option<crate::analyze_trace::AnalyzeTraceResult>,
    pub cpu_profile: Option<String>,
    pub tsconfig_paths: Vec<String>,
    pub selected_tsconfig: Option<String>,
    pub settings: Settings,
    pub verbose: bool,
    pub cake: LayerCake,
    pub auth_code: Option<String>,
    pub type_graph: Option<crate::type_graph::TypeGraph>,
    pub process_controller: ProcessController,
}

impl AppData {
    pub fn get_outputs_dir(app_handle: &AppHandle) -> String {
        app_handle
            .path()
            .app_data_dir()
            .expect("app_data_dir unavailable")
            .join("outputs")
            .to_string_lossy()
            .to_string()
    }

    pub fn new(app_handle: &AppHandle) -> Self {
        // Determine the app-specific data directory provided by Tauri
        let base_data_dir = app_handle
            .path()
            .app_data_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap();
        info!("using base_data_dir: {}", base_data_dir);

        let data_dir = Self::get_outputs_dir(app_handle);
        info!("using outputs data_dir: {}", data_dir);
        // Build a single LayerCake and reuse it across init functions
        let mut cake = LayerCake::new(LayerCakeInitArgs {
            config_filename: "typeslayer.toml",
            precedence: [Source::Env, Source::Flag, Source::File],
            env_prefix: "TYPESLAYER_",
        });
        cake.load_config_in_dir(&base_data_dir);
        let project_root = Self::init_project_root_with(&cake);
        let types_json = Self::init_types_json(&data_dir, &project_root);
        let trace_json = Self::init_trace_json(&data_dir, &project_root);
        let analyze_trace = Self::init_analyze_trace(&data_dir);
        let type_graph = Self::init_type_graph(&data_dir);
        let cpu_profile = Self::init_cpu_profile(&data_dir);
        let settings = Self::settings_from_cake(&cake);
        let verbose = Self::init_verbose_with(&cake);
        let auth_code = Self::init_auth_code_with(&cake);

        let mut app = Self {
            project_root,
            types_json,
            trace_json,
            analyze_trace,
            cpu_profile,
            tsconfig_paths: Vec::new(),
            selected_tsconfig: None,
            settings,
            verbose,
            cake,
            auth_code,
            type_graph,
            process_controller: ProcessController::new(),
        };
        app.discover_tsconfigs();
        app.selected_tsconfig = Self::init_selected_tsconfig_with(&app.cake, &app.tsconfig_paths);
        app
    }

    fn init_project_root_with(cake: &LayerCake) -> String {
        // If neither env nor CLI flag have been provided, favor the current working directory
        // when it already contains a package.json. This prevents stale typeslayer.toml entries
        // from overriding local runs.
        let no_env_or_flag = !cake.has_env("PROJECT_ROOT") && !cake.has_flag("--project-root");
        if no_env_or_flag {
            if let Some(cwd_pkg) = Self::detect_project_root_from_cwd() {
                if let Ok(validated) = Self::validate_project_root_path(&cwd_pkg) {
                    info!("using project_root from current directory: {}", validated);
                    return validated;
                }
            }
        }

        cake.resolve_string(ResolveStringArgs {
            env: "PROJECT_ROOT",
            flag: "--project-root",
            file: "project_root",
            default: || {
                std::env::current_dir()
                    .map(|p| p.join("package.json").to_string_lossy().to_string())
                    .unwrap_or_else(|_| "./package.json".to_string())
            },
            validate: |s| Self::validate_project_root_path(s),
        })
    }

    fn detect_project_root_from_cwd() -> Option<String> {
        let cwd = std::env::current_dir().ok()?;
        let pkg_path = cwd.join("package.json");
        if pkg_path.exists() {
            Some(pkg_path.to_string_lossy().to_string())
        } else {
            None
        }
    }

    fn validate_project_root_path(s: &str) -> Result<String, String> {
        let p = std::path::Path::new(s);

        if p.file_name().map(|f| f == "package.json").unwrap_or(false) {
            if !p.exists() {
                return Err(format!("package.json not found at: {}", s));
            }
            return Ok(p.to_string_lossy().to_string());
        }

        if p.exists() && p.is_dir() {
            let pkg_path = p.join("package.json");
            if !pkg_path.exists() {
                return Err(format!("package.json not found in directory: {}", s));
            }
            return Ok(pkg_path.to_string_lossy().to_string());
        }

        Err(format!(
            "Path must be an existing package.json file or directory containing one: {}",
            s
        ))
    }

    fn init_verbose_with(cake: &LayerCake) -> bool {
        cake.resolve_bool(ResolveBoolArgs {
            env: "VERBOSE",
            flag: "--verbose",
            file: "verbose",
            default: || {
                #[cfg(debug_assertions)]
                {
                    true
                }
                #[cfg(not(debug_assertions))]
                {
                    false
                }
            },
        })
    }

    fn init_auth_code_with(cake: &LayerCake) -> Option<String> {
        let code = cake.resolve_string(ResolveStringArgs {
            env: "AUTH_CODE",
            flag: "--auth-code",
            file: "auth_code",
            default: || "".to_string(),
            validate: |s| Ok(s.to_string()),
        });
        tracing::info!("init_auth_code_with: resolved code = '{}'", code);
        if code.is_empty() { None } else { Some(code) }
    }

    fn init_selected_tsconfig_with(cake: &LayerCake, tsconfig_paths: &[String]) -> Option<String> {
        let auto_detect = || {
            // Prefer tsconfig.json, then first found tsconfig
            for path in tsconfig_paths.iter() {
                if path.ends_with("tsconfig.json") {
                    return path.clone();
                }
            }
            tsconfig_paths.first().cloned().unwrap_or_default()
        };

        let result = cake.resolve_string(ResolveStringArgs {
            env: "TSCONFIG",
            flag: "--tsconfig",
            file: "settings.tsconfig",
            default: auto_detect,
            validate: |s| {
                if s.is_empty() || tsconfig_paths.contains(&s.to_string()) {
                    Ok(s.to_string())
                } else {
                    Err(format!("tsconfig '{}' not found in discovered paths", s))
                }
            },
        });

        if result.is_empty() {
            None
        } else {
            Some(result)
        }
    }

    fn discover_tsconfigs(&mut self) {
        self.tsconfig_paths.clear();

        // Get the directory containing the package.json
        let project_dir = std::path::Path::new(&self.project_root)
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| std::path::PathBuf::from("."));

        // Search for tsconfig*.json files in the project directory and subdirectories
        if let Ok(entries) = fs::read_dir(&project_dir) {
            for entry in entries.flatten() {
                if let Ok(file_name) = entry.file_name().into_string() {
                    if file_name.starts_with("tsconfig") && file_name.ends_with(".json") {
                        if let Ok(full_path) = entry.path().canonicalize() {
                            self.tsconfig_paths
                                .push(full_path.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }

        // Sort with tsconfig.json first
        self.tsconfig_paths.sort_by(|a, b| {
            let a_is_main = a.ends_with("tsconfig.json");
            let b_is_main = b.ends_with("tsconfig.json");
            match (a_is_main, b_is_main) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.cmp(b),
            }
        });
    }

    pub fn update_project_root(&mut self, new_root: String) {
        self.project_root = new_root;
        let previous_selection = self.selected_tsconfig.clone();

        self.discover_tsconfigs();

        // Try to keep previous selection if it still exists
        if let Some(prev) = previous_selection {
            if self.tsconfig_paths.contains(&prev) {
                self.selected_tsconfig = Some(prev);
                return;
            }
        }

        // Otherwise, auto-detect
        self.selected_tsconfig =
            Self::init_selected_tsconfig_with(&self.cake, &self.tsconfig_paths);
    }
    // Blocking helper that runs tsc directly with optional tsconfig
    fn run_typescript_with_flag_blocking(
        project_root: String,
        tsconfig_path: Option<String>,
        data_dir: String,
        flag: String,
        extra_tsc_flags: String,
        context: &str,
        process_controller: ProcessController,
    ) -> Result<(), String> {
        fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create data directory: {e}"))?;

        process_controller.reset_cancel_flag();

        // Build tsc command
        let mut command_parts = vec!["tsc".to_string()];

        if let Some(tsconfig) = tsconfig_path {
            command_parts.push("--project".to_string());
            command_parts.push(tsconfig);
        }

        // Add configurable extra flags
        let extra_flag_parts: Vec<&str> = extra_tsc_flags.trim().split_whitespace().collect();
        for part in extra_flag_parts {
            command_parts.push(part.to_string());
        }

        let flag_parts: Vec<&str> = flag.trim().split_whitespace().collect();
        for part in flag_parts {
            command_parts.push(part.to_string());
        }

        let full_command = command_parts.join(" ");
        let npm_command = format!("npm exec -- {}", full_command);

        let cwd = std::path::Path::new(&project_root)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| "./".to_string());

        info!("Executing command: {}", npm_command);
        info!("Working directory: {}", cwd);
        info!("Outputs directory (data_dir): {}", data_dir);

        let mut cmd = Command::new("sh");
        cmd.arg("-c")
            .arg(&npm_command)
            .current_dir(&cwd)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        let child = cmd
            .spawn()
            .map_err(|e| format!("Failed to execute command: {e}"))?;

        process_controller.register_process(child.id());

        let output = child
            .wait_with_output()
            .map_err(|e| format!("Failed to wait for command completion: {e}"))?;

        let cancelled = process_controller.cancel_requested();
        process_controller.clear_current_process();
        process_controller.reset_cancel_flag();

        if cancelled {
            return Err("Operation cancelled".to_string());
        }

        if !output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!(
                "{context} failed:\nSTDOUT:\n{stdout}\nSTDERR:\n{stderr}"
            ));
        }

        info!("Command completed successfully: {}", context);
        Ok(())
    }

    // Async helper to validate outputs in data_dir and return parsed results
    async fn validate_types_and_trace_async(
        data_dir: &str,
    ) -> Result<
        (
            TypesJsonSchema,
            Vec<crate::validate::trace_json::TraceEvent>,
        ),
        String,
    > {
        let types_path = std::path::Path::new(data_dir)
            .join(TYPES_JSON_FILENAME.trim_start_matches('/'))
            .to_string_lossy()
            .to_string();
        let trace_path = std::path::Path::new(data_dir)
            .join(TRACE_JSON_FILENAME.trim_start_matches('/'))
            .to_string_lossy()
            .to_string();

        // Read/parse concurrently
        let (types_res, trace_res) = tokio::join!(
            load_types_json(types_path.clone()),
            read_trace_json(&trace_path)
        );

        let types = types_res.map_err(|e| {
            format!(
                "types.json validation failed: {}\nExpected file at: {}",
                e, types_path
            )
        })?;
        let trace = trace_res.map_err(|e| {
            format!(
                "trace.json validation failed: {}\nExpected file at: {}",
                e, trace_path
            )
        })?;

        Ok((types, trace))
    }

    fn init_types_json(data_dir: &str, project_root: &str) -> TypesJsonSchema {
        // project_root is now package.json path, get directory
        let project_dir = std::path::Path::new(project_root)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| "./".to_string());

        let type_paths = [
            std::path::Path::new(data_dir)
                .join(TYPES_JSON_FILENAME.trim_start_matches('/'))
                .to_string_lossy()
                .to_string(),
            std::path::Path::new(&project_dir)
                .join(TYPES_JSON_FILENAME.trim_start_matches('/'))
                .to_string_lossy()
                .to_string(),
        ];
        for p in type_paths.iter() {
            if Path::new(p).exists() {
                match std::fs::read_to_string(p)
                    .map_err(|e| e.to_string())
                    .and_then(|s| parse_types_json(p, &s))
                {
                    Ok(parsed) => return parsed,
                    Err(e) => info!("Startup types.json ingestion failed at {p}: {e}"),
                }
            }
        }
        Vec::new()
    }

    fn init_trace_json(
        data_dir: &str,
        project_root: &str,
    ) -> Vec<crate::validate::trace_json::TraceEvent> {
        // project_root is now package.json path, get directory
        let project_dir = std::path::Path::new(project_root)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| "./".to_string());

        let trace_paths = [
            std::path::Path::new(data_dir)
                .join(TRACE_JSON_FILENAME.trim_start_matches('/'))
                .to_string_lossy()
                .to_string(),
            std::path::Path::new(&project_dir)
                .join(TRACE_JSON_FILENAME.trim_start_matches('/'))
                .to_string_lossy()
                .to_string(),
        ];
        for p in trace_paths.iter() {
            if Path::new(p).exists() {
                match std::fs::read_to_string(p)
                    .map_err(|e| e.to_string())
                    .and_then(|s| parse_trace_json(p, &s))
                {
                    Ok(parsed) => return parsed,
                    Err(e) => info!("Startup trace.json ingestion failed at {p}: {e}"),
                }
            }
        }
        Vec::new()
    }

    fn init_analyze_trace(data_dir: &str) -> Option<crate::analyze_trace::AnalyzeTraceResult> {
        let analyze_path = Path::new(data_dir).join(ANALYZE_TRACE_FILENAME);
        if analyze_path.exists() {
            match std::fs::read_to_string(&analyze_path)
                .map_err(|e| e.to_string())
                .and_then(|s| {
                    serde_json::from_str::<crate::analyze_trace::AnalyzeTraceResult>(&s)
                        .map_err(|e| e.to_string())
                }) {
                Ok(parsed) => return Some(parsed),
                Err(e) => info!(
                    "Startup analyze-trace ingestion failed at {}: {}",
                    analyze_path.display(),
                    e
                ),
            }
        }
        None
    }

    fn init_type_graph(data_dir: &str) -> Option<crate::type_graph::TypeGraph> {
        let path = Path::new(data_dir)
            .join(crate::type_graph::TYPE_GRAPH_FILENAME.trim_start_matches('/'));
        if path.exists() {
            match std::fs::read_to_string(&path)
                .map_err(|e| e.to_string())
                .and_then(|s| {
                    serde_json::from_str::<crate::type_graph::TypeGraph>(&s)
                        .map_err(|e| e.to_string())
                }) {
                Ok(parsed) => return Some(parsed),
                Err(e) => info!(
                    "Startup type-graph ingestion failed at {}: {}",
                    path.display(),
                    e
                ),
            }
        }
        None
    }

    fn init_cpu_profile(data_dir: &str) -> Option<String> {
        let cpu_profile_path = Path::new(data_dir).join(CPU_PROFILE_FILENAME);
        if cpu_profile_path.exists() {
            match std::fs::read_to_string(&cpu_profile_path) {
                Ok(contents) => return Some(contents),
                Err(e) => info!(
                    "Startup CPU profile ingestion failed at {}: {}",
                    cpu_profile_path.display(),
                    e
                ),
            }
        }
        None
    }

    pub fn compute_window_title(&self) -> String {
        // self.project_root points to package.json
        let default_title = "TypeSlayer".to_string();
        let pkg_path = std::path::Path::new(&self.project_root);
        // Attempt to read and parse the package.json name; fallback to default on any error.
        match std::fs::read_to_string(pkg_path)
            .ok()
            .and_then(|contents| serde_json::from_str::<serde_json::Value>(&contents).ok())
            .and_then(|v| {
                v.get("name")
                    .and_then(|n| n.as_str())
                    .map(|s| s.to_string())
            }) {
            Some(name) if !name.is_empty() => format!("{} | {}", default_title, name),
            _ => default_title,
        }
    }
}

#[tauri::command]
pub async fn set_window_title_from_project(
    app: tauri::AppHandle,
    state: State<'_, Mutex<AppData>>,
) -> Result<(), String> {
    let guard = state.lock().map_err(|_| "state poisoned".to_string())?;
    let title = guard.compute_window_title();
    let win = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;
    win.set_title(&title)
        .map_err(|e| format!("failed to set title: {}", e))
}

#[derive(serde::Serialize)]
struct OutputTimestamps {
    types_json: Option<String>,
    trace_json: Option<String>,
    analyze_trace: Option<String>,
    type_graph: Option<String>,
    cpu_profile: Option<String>,
}

#[derive(serde::Serialize)]
struct TypeSlayerConfig<'a> {
    project_root: &'a str,
    data_dir: &'a str,
    verbose: bool,
    settings: &'a Settings,
    outputs: OutputTimestamps,
}

impl AppData {
    fn file_mtime_iso(path: &Path) -> Option<String> {
        if let Ok(meta) = fs::metadata(path) {
            if let Ok(modified) = meta.modified() {
                return Some(chrono::DateTime::<chrono::Utc>::from(modified).to_rfc3339());
            }
        }
        None
    }

    pub fn update_outputs(&self, app: &AppHandle) {
        let base_data_dir = app.path().app_data_dir().expect("app_data_dir unavailable");
        let data_dir = base_data_dir.join("outputs");
        let data_dir_str = data_dir.to_string_lossy().to_string();
        let config_path = base_data_dir.join("typeslayer.toml");
        let types_path = data_dir.join(TYPES_JSON_FILENAME.trim_start_matches('/'));
        let trace_path = data_dir.join(TRACE_JSON_FILENAME.trim_start_matches('/'));
        let analyze_path = data_dir.join(ANALYZE_TRACE_FILENAME);
        let type_graph_path =
            data_dir.join(crate::type_graph::TYPE_GRAPH_FILENAME.trim_start_matches('/'));
        let cpu_path = data_dir.join(CPU_PROFILE_FILENAME);

        let outputs = OutputTimestamps {
            types_json: Self::file_mtime_iso(&types_path),
            trace_json: Self::file_mtime_iso(&trace_path),
            analyze_trace: Self::file_mtime_iso(&analyze_path),
            type_graph: Self::file_mtime_iso(&type_graph_path),
            cpu_profile: Self::file_mtime_iso(&cpu_path),
        };

        let cfg = TypeSlayerConfig {
            project_root: &self.project_root,
            data_dir: &data_dir_str,
            verbose: self.verbose,
            settings: &self.settings,
            outputs,
        };

        match toml::to_string(&cfg) {
            Ok(s) => {
                if let Err(e) = fs::create_dir_all(&data_dir) {
                    error!("Failed to create temp dir for config: {}", e);
                    return;
                }
                if let Err(e) = fs::write(&config_path, s) {
                    error!(
                        "Failed to write config file {}: {}",
                        config_path.display(),
                        e
                    );
                }
            }
            Err(e) => error!("Failed to serialize config: {}", e),
        }
    }

    pub fn clear_outputs_dir(&mut self, app: &AppHandle) -> Result<(), String> {
        let data_dir = Self::get_outputs_dir(app);
        let outputs_path = Path::new(&data_dir);

        fs::create_dir_all(outputs_path)
            .map_err(|e| format!("failed to ensure outputs directory exists: {e}"))?;

        if outputs_path.exists() {
            for entry in fs::read_dir(outputs_path)
                .map_err(|e| format!("failed to read outputs directory: {e}"))?
            {
                let entry = entry.map_err(|e| format!("failed to inspect outputs entry: {e}"))?;
                let path = entry.path();
                if path.is_dir() {
                    fs::remove_dir_all(&path)
                        .map_err(|e| format!("failed to remove directory {:?}: {e}", path))?;
                } else {
                    fs::remove_file(&path)
                        .map_err(|e| format!("failed to remove file {:?}: {e}", path))?;
                }
            }
        }

        self.types_json.clear();
        self.trace_json.clear();
        self.analyze_trace = None;
        self.cpu_profile = None;
        self.type_graph = None;

        self.update_outputs(app);
        Ok(())
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub simplify_paths: bool,
    pub prefer_editor_open: bool,
    pub auto_start: bool,
    pub preferred_editor: Option<String>,
    pub extra_tsc_flags: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            simplify_paths: true,
            prefer_editor_open: true,
            auto_start: true,
            preferred_editor: Some("code".to_string()),
            extra_tsc_flags: "--noEmit --incremental false --noErrorTruncation".to_string(),
        }
    }
}

impl Settings {
    pub fn default_extra_tsc_flags() -> String {
        "--noEmit --incremental false --noErrorTruncation".to_string()
    }
}

impl AppData {
    fn settings_from_cake(cake: &LayerCake) -> Settings {
        let simplify_paths = cake.resolve_bool(ResolveBoolArgs {
            env: "SIMPLIFY_PATHS",
            flag: "--simplify-paths",
            file: "settings.simplifyPaths",
            default: || true,
        });
        let prefer_editor_open = cake.resolve_bool(ResolveBoolArgs {
            env: "PREFER_EDITOR_OPEN",
            flag: "--prefer-editor-open",
            file: "settings.preferEditorOpen",
            default: || true,
        });
        let preferred_editor = Some(cake.resolve_string(ResolveStringArgs {
            env: "PREFERRED_EDITOR",
            flag: "--preferred-editor",
            file: "settings.preferredEditor",
            default: || "code".to_string(),
            validate: |s| {
                if AVAILABLE_EDITORS.iter().any(|(cmd, _)| *cmd == s) {
                    Ok(s.to_string())
                } else {
                    Err(format!("Editor '{}' not in available editors list", s))
                }
            },
        }));
        let auto_start = cake.resolve_bool(ResolveBoolArgs {
            env: "AUTO_START",
            flag: "--autoStart",
            file: "settings.autoStart",
            default: || true,
        });
        let extra_tsc_flags = cake.resolve_string(ResolveStringArgs {
            env: "EXTRA_TSC_FLAGS",
            flag: "--extra-tsc-flags",
            file: "settings.extraTscFlags",
            default: Settings::default_extra_tsc_flags,
            validate: |s| Ok(s.to_string()),
        });
        Settings {
            simplify_paths,
            prefer_editor_open,
            auto_start,
            preferred_editor,
            extra_tsc_flags,
        }
    }
}

#[tauri::command]
pub async fn validate_types_json(
    app: AppHandle,
    state: State<'_, Mutex<AppData>>,
) -> Result<TypesJsonSchema, String> {
    let data_dir = AppData::get_outputs_dir(&app);
    let path = format!("{}{}", data_dir, TYPES_JSON_FILENAME);
    let result = load_types_json(path).await?;
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.types_json = result.clone();
    Ok(result)
}

#[tauri::command]
pub async fn validate_trace_json(
    app: AppHandle,
    state: State<'_, Mutex<AppData>>,
) -> Result<Vec<crate::validate::trace_json::TraceEvent>, String> {
    let data_dir = AppData::get_outputs_dir(&app);
    let path = format!("{}{}", data_dir, TRACE_JSON_FILENAME);
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
pub async fn get_tsconfig_paths(state: State<'_, Mutex<AppData>>) -> Result<Vec<String>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.tsconfig_paths.clone())
}

#[tauri::command]
pub async fn get_selected_tsconfig(
    state: State<'_, Mutex<AppData>>,
) -> Result<Option<String>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.selected_tsconfig.clone())
}

#[tauri::command]
pub async fn set_selected_tsconfig(
    state: State<'_, Mutex<AppData>>,
    tsconfig_path: String,
) -> Result<(), String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;

    // Empty string means no tsconfig (valid)
    if tsconfig_path.is_empty() {
        data.selected_tsconfig = None;
        return Ok(());
    }

    // Validate that the path exists in discovered tsconfigs
    if !data.tsconfig_paths.contains(&tsconfig_path) {
        return Err(format!(
            "tsconfig '{}' not found in discovered paths",
            tsconfig_path
        ));
    }

    data.selected_tsconfig = Some(tsconfig_path);
    Ok(())
}

#[tauri::command]
pub async fn clear_outputs(
    app: AppHandle,
    state: State<'_, Mutex<AppData>>,
    cancel_running: bool,
) -> Result<(), String> {
    let controller = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.process_controller.clone()
    };

    if cancel_running {
        controller.request_cancel()?;
    }

    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.clear_outputs_dir(&app)
}

#[tauri::command]
pub async fn generate_trace(
    app: AppHandle,
    state: State<'_, Mutex<AppData>>,
) -> Result<TypesJsonSchema, String> {
    // Short lock to get values we need
    let (tsconfig_path, project_root, process_controller, extra_tsc_flags) = {
        let data = state.lock().map_err(|e| e.to_string())?;
        (
            data.selected_tsconfig.clone(),
            data.project_root.clone(),
            data.process_controller.clone(),
            data.settings.extra_tsc_flags.clone(),
        )
    };

    let data_dir = AppData::get_outputs_dir(&app);

    info!("generate_trace: will write outputs under {}", data_dir);
    let handle = tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let flag = format!("--generateTrace {}", data_dir);
        AppData::run_typescript_with_flag_blocking(
            project_root,
            tsconfig_path,
            data_dir,
            flag,
            extra_tsc_flags,
            "TypeScript compilation with trace generation",
            process_controller,
        )
    });

    match handle.await {
        Ok(Ok(())) => {
            // Now read/validate outputs asynchronously
            let data_dir = AppData::get_outputs_dir(&app);

            // List files in output directory for debugging
            info!("Listing files in output directory: {}", data_dir);
            if let Ok(entries) = std::fs::read_dir(&data_dir) {
                for entry in entries.flatten() {
                    if let Ok(file_name) = entry.file_name().into_string() {
                        info!("  Found file: {}", file_name);
                    }
                }
            } else {
                info!("Could not read output directory: {}", data_dir);
            }

            let (types, trace) = AppData::validate_types_and_trace_async(&data_dir).await?;
            let mut data = state.lock().map_err(|e| e.to_string())?;
            data.types_json = types.clone();
            data.trace_json = trace;
            AppData::update_outputs(&data, &app);
            Ok(types)
        }
        Ok(Err(e)) => Err(e),
        Err(e) => Err(format!("generate_trace join error: {}", e)),
    }
}

#[tauri::command]
pub async fn generate_cpu_profile(
    app: AppHandle,
    state: State<'_, Mutex<AppData>>,
) -> Result<(), String> {
    let (tsconfig_path, project_root, process_controller, extra_tsc_flags) = {
        let data = state.lock().map_err(|e| e.to_string())?;
        (
            data.selected_tsconfig.clone(),
            data.project_root.clone(),
            data.process_controller.clone(),
            data.settings.extra_tsc_flags.clone(),
        )
    };

    let data_dir = AppData::get_outputs_dir(&app);

    info!(
        "generate_cpu_profile: will write profile under {}",
        data_dir
    );
    let handle = tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let flag = format!("--generateCpuProfile {}/{}", data_dir, CPU_PROFILE_FILENAME);
        AppData::run_typescript_with_flag_blocking(
            project_root,
            tsconfig_path,
            data_dir,
            flag,
            extra_tsc_flags,
            "TypeScript CPU profile run",
            process_controller,
        )
    });

    match handle.await {
        Ok(r) => {
            // On success, read and cache CPU profile contents
            if r.is_ok() {
                let data_dir = AppData::get_outputs_dir(&app);
                let path = Path::new(&data_dir).join(CPU_PROFILE_FILENAME);
                match tokio::fs::read_to_string(&path).await {
                    Ok(contents) => {
                        let mut data = state.lock().map_err(|e| e.to_string())?;
                        data.cpu_profile = Some(contents);
                        AppData::update_outputs(&data, &app);
                    }
                    Err(e) => error!("Failed to read CPU profile after generation: {}", e),
                }
            }
            r
        }
        Err(e) => Err(format!("generate_cpu_profile join error: {}", e)),
    }
}

#[tauri::command]
pub async fn analyze_trace_command(
    app: AppHandle,
    state: State<'_, Mutex<AppData>>,
    options: Option<crate::analyze_trace::AnalyzeTraceOptions>,
) -> Result<crate::analyze_trace::AnalyzeTraceResult, String> {
    info!("Starting analyze trace...");
    let data_dir = AppData::get_outputs_dir(&app);
    info!(
        "analyze_trace: reading inputs and writing output under {}",
        data_dir
    );

    let trace_dir_for_log = data_dir.clone();
    let handle = tauri::async_runtime::spawn_blocking(move || {
        match crate::analyze_trace::analyze_trace(&data_dir, options) {
            Ok(result) => {
                info!("Analyze trace completed successfully");
                Ok::<crate::analyze_trace::AnalyzeTraceResult, String>(result)
            }
            Err(e) => {
                error!("Analyze trace failed: {}", e);
                Err(e)
            }
        }
    });

    match handle.await {
        Ok(r) => {
            if let Ok(res) = &r {
                let mut data = state.lock().map_err(|e| e.to_string())?;
                data.analyze_trace = Some(res.clone());
                AppData::update_outputs(&data, &app);
                info!(
                    "analyze_trace: wrote {} in {}",
                    ANALYZE_TRACE_FILENAME, trace_dir_for_log
                );
            }
            r
        }
        Err(e) => Err(format!("analyze_trace_command join error: {}", e)),
    }
}

#[tauri::command]
pub async fn get_analyze_trace(
    app: AppHandle,
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
    let data_dir = AppData::get_outputs_dir(&app);
    let path = Path::new(&data_dir).join("analyze-trace.json");
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
pub async fn get_simplify_paths(state: State<'_, Mutex<AppData>>) -> Result<bool, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.settings.simplify_paths)
}

#[tauri::command]
pub async fn set_simplify_paths(
    app: AppHandle,
    state: State<'_, Mutex<AppData>>,
    value: bool,
) -> Result<(), String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.settings.simplify_paths = value;
    AppData::update_outputs(&data, &app);
    Ok(())
}

#[tauri::command]
pub async fn get_prefer_editor_open(state: State<'_, Mutex<AppData>>) -> Result<bool, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.settings.prefer_editor_open)
}

#[tauri::command]
pub async fn set_prefer_editor_open(
    app: AppHandle,
    state: State<'_, Mutex<AppData>>,
    value: bool,
) -> Result<(), String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.settings.prefer_editor_open = value;
    AppData::update_outputs(&data, &app);
    Ok(())
}

#[tauri::command]
pub async fn get_auto_start(state: State<'_, Mutex<AppData>>) -> Result<bool, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.settings.auto_start)
}

#[tauri::command]
pub async fn set_auto_start(
    app: AppHandle,
    state: State<'_, Mutex<AppData>>,
    value: bool,
) -> Result<(), String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.settings.auto_start = value;
    AppData::update_outputs(&data, &app);
    Ok(())
}

#[tauri::command]
pub async fn open_file(state: State<'_, Mutex<AppData>>, path: String) -> Result<(), String> {
    // Extract settings without holding the lock during blocking operations.
    let (prefer_editor, preferred_editor) = {
        let data = state.lock().map_err(|e| e.to_string())?;
        (
            data.settings.prefer_editor_open,
            data.settings.preferred_editor.clone(),
        )
    };

    // Resolve editor via precedence using the app's cake (Env > Flag > File)
    let cli_or_env_editor = {
        let data = state.lock().map_err(|e| e.to_string())?;
        let v = data.cake.resolve_string(ResolveStringArgs {
            env: "EDITOR",
            flag: "--editor",
            file: "settings.preferredEditor",
            default: || "".to_string(),
            validate: |s| Ok(s.to_string()),
        });
        if v.is_empty() { None } else { Some(v) }
    };

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
            // Built-in available editors list
            let available_editors: Vec<(String, String)> = AVAILABLE_EDITORS
                .iter()
                .map(|(c, n)| (c.to_string(), n.to_string()))
                .collect();
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
    let _ = state; // unused
    Ok(AVAILABLE_EDITORS
        .iter()
        .map(|(c, n)| (c.to_string(), n.to_string()))
        .collect())
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
    app: AppHandle,
    state: State<'_, Mutex<AppData>>,
    editor: String,
) -> Result<(), String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;

    // Validate that editor is in AVAILABLE_EDITORS
    let is_valid = AVAILABLE_EDITORS.iter().any(|(cmd, _)| *cmd == editor);

    if !is_valid {
        return Err(format!(
            "Editor '{}' is not in available editors list",
            editor
        ));
    }

    data.settings.preferred_editor = Some(editor);
    AppData::update_outputs(&data, &app);
    Ok(())
}

#[tauri::command]
pub async fn get_extra_tsc_flags(state: State<'_, Mutex<AppData>>) -> Result<String, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.settings.extra_tsc_flags.clone())
}

#[tauri::command]
pub async fn get_default_extra_tsc_flags() -> Result<String, String> {
    Ok(Settings::default_extra_tsc_flags())
}

#[tauri::command]
pub async fn set_extra_tsc_flags(
    app: AppHandle,
    state: State<'_, Mutex<AppData>>,
    flags: String,
) -> Result<(), String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.settings.extra_tsc_flags = flags;
    AppData::update_outputs(&data, &app);
    Ok(())
}

#[tauri::command]
pub async fn get_treemap_data(
    state: State<'_, Mutex<AppData>>,
) -> Result<Vec<crate::treemap::TreemapNode>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    let treemap_data = crate::treemap::build_treemap_from_trace(&data.trace_json)?;
    Ok(treemap_data)
}
