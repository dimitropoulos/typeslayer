use crate::{
    analyze_trace::constants::ANALYZE_TRACE_FILENAME,
    files::OUTPUTS_DIRECTORY,
    layercake::{LayerCake, LayerCakeInitArgs, ResolveBoolArgs, ResolveStringArgs, Source},
    process_controller::ProcessController,
    utils::{PACKAGE_JSON_FILENAME, TSCONFIG_FILENAME, make_cli_arg, quote_if_needed},
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
use std::io::Write;
use std::path::Path;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{Manager, State};
use tracing::{error, info};

const CONFIG_FILENAME: &str = "typeslayer.toml";

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

#[derive(Clone)]
pub struct AppData {
    pub project_root: PathBuf,
    pub types_json: TypesJsonSchema,
    pub trace_json: Vec<crate::validate::trace_json::TraceEvent>,
    pub analyze_trace: Option<crate::analyze_trace::AnalyzeTraceResult>,
    pub cpu_profile: Option<String>,
    pub tsconfig_paths: Vec<PathBuf>,
    pub selected_tsconfig: Option<PathBuf>,
    pub settings: Settings,
    pub verbose: bool,
    pub cake: LayerCake,
    pub auth_code: Option<String>,
    pub type_graph: Option<crate::type_graph::TypeGraph>,
    pub process_controller: ProcessController,
    pub data_dir: PathBuf,
}

impl AppData {
    pub fn new(data_dir: PathBuf) -> Self {
        info!("using base data_dir: {}", data_dir.display());
        // Build a single LayerCake and reuse it across init functions
        let mut cake = LayerCake::new(LayerCakeInitArgs {
            config_filename: CONFIG_FILENAME,
            precedence: [Source::Env, Source::Flag, Source::File],
            env_prefix: "TYPESLAYER_",
        });
        cake.load_config_in_dir(&data_dir.to_string_lossy());
        let project_root = Self::init_project_root_with(&cake);

        let outputs_dir = data_dir.join(OUTPUTS_DIRECTORY);
        let types_json = Self::init_types_json(&outputs_dir, &project_root);
        let trace_json = Self::init_trace_json(&outputs_dir, &project_root);
        let analyze_trace = Self::init_analyze_trace(&outputs_dir);
        let type_graph = Self::init_type_graph(&outputs_dir);
        let cpu_profile = Self::init_cpu_profile(&outputs_dir);
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
            data_dir,
        };
        app.discover_tsconfigs();
        app.selected_tsconfig = Self::init_selected_tsconfig_with(&app.cake, &app.tsconfig_paths);
        app
    }

    pub fn outputs_dir(&self) -> std::path::PathBuf {
        self.data_dir.join(OUTPUTS_DIRECTORY)
    }

    fn init_project_root_with(cake: &LayerCake) -> PathBuf {
        // If neither env nor CLI flag have been provided, favor the current working directory
        // when it already contains a package.json. This prevents stale typeslayer.toml entries
        // from overriding local runs.
        let no_env_or_flag = !cake.has_env("PROJECT_ROOT") && !cake.has_flag("--project-root");
        if no_env_or_flag {
            if let Some(cwd_pkg) = Self::detect_project_root_from_cwd() {
                if let Ok(validated) = Self::validate_project_root_path(&cwd_pkg.to_string_lossy())
                {
                    info!(
                        "using project_root from current directory: {}",
                        validated.display()
                    );
                    return validated;
                }
            }
        }

        let resolved = cake.resolve_string(ResolveStringArgs {
            env: "PROJECT_ROOT",
            flag: "--project-root",
            file: "project_root",
            default: || {
                std::env::current_dir()
                    .map(|p| p.join(PACKAGE_JSON_FILENAME).to_string_lossy().to_string())
                    .unwrap_or_else(|_| "./package.json".to_string())
            },
            validate: |s| {
                Self::validate_project_root_path(s).map(|p| p.to_string_lossy().to_string())
            },
        });
        let path = PathBuf::from(resolved);
        info!(
            "resolved project_root from config/env/flag: {}",
            path.display()
        );
        path
    }

    fn detect_project_root_from_cwd() -> Option<PathBuf> {
        let cwd = std::env::current_dir().ok()?;
        let pkg_path = cwd.join(PACKAGE_JSON_FILENAME);
        info!("checking for package.json in cwd: {}", cwd.display());
        if pkg_path.exists() {
            info!("found package.json in cwd: {}", pkg_path.display());
            return Some(pkg_path);
        }

        // Also check PWD environment variable in case cwd was changed
        if let Ok(pwd) = std::env::var("PWD") {
            let pwd_path = std::path::Path::new(&pwd).join(PACKAGE_JSON_FILENAME);
            info!("checking for package.json in PWD: {}", pwd);
            if pwd_path.exists() {
                info!("found package.json in PWD: {}", pwd_path.display());
                return Some(pwd_path);
            }
        }

        info!("no package.json found in cwd or PWD");
        None
    }

    fn validate_project_root_path(s: &str) -> Result<PathBuf, String> {
        let p = std::path::Path::new(s);

        if p.file_name()
            .map(|f| f == PACKAGE_JSON_FILENAME)
            .unwrap_or(false)
        {
            if !p.exists() {
                return Err(format!("package.json not found at: {}", s));
            }
            return Ok(p.to_path_buf());
        }

        if p.exists() && p.is_dir() {
            let pkg_path = p.join(PACKAGE_JSON_FILENAME);
            if !pkg_path.exists() {
                return Err(format!("package.json not found in directory: {}", s));
            }
            return Ok(pkg_path);
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

    fn init_selected_tsconfig_with(
        cake: &LayerCake,
        tsconfig_paths: &[std::path::PathBuf],
    ) -> Option<PathBuf> {
        let auto_detect = || {
            // Prefer tsconfig.json, then first found tsconfig
            for path in tsconfig_paths.iter() {
                if path
                    .file_name()
                    .map_or(false, |name| name == TSCONFIG_FILENAME)
                {
                    return path.to_string_lossy().to_string();
                }
            }
            tsconfig_paths
                .first()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default()
        };

        let result = cake.resolve_string(ResolveStringArgs {
            env: "TSCONFIG",
            flag: "--tsconfig",
            file: "settings.tsconfig",
            default: auto_detect,
            validate: |s| {
                if s.is_empty() || tsconfig_paths.iter().any(|p| p.to_string_lossy() == s) {
                    Ok(s.to_string())
                } else {
                    Err(format!("tsconfig '{}' not found in discovered paths", s))
                }
            },
        });

        if result.is_empty() {
            None
        } else {
            Some(PathBuf::from(result))
        }
    }

    fn discover_tsconfigs(&mut self) {
        self.tsconfig_paths.clear();

        // Get the directory containing the package.json
        let project_dir = self
            .project_root
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| std::path::PathBuf::from("."));

        // Search for tsconfig*.json files in the project directory and subdirectories
        if let Ok(entries) = fs::read_dir(&project_dir) {
            for entry in entries.flatten() {
                if let Ok(file_name) = entry.file_name().into_string() {
                    if file_name.starts_with("tsconfig") && file_name.ends_with(".json") {
                        if let Ok(full_path) = entry.path().canonicalize() {
                            self.tsconfig_paths.push(full_path);
                        }
                    }
                }
            }
        }

        // Sort with tsconfig.json first
        self.tsconfig_paths.sort_by(|a, b| {
            let a_is_main = a
                .file_name()
                .map_or(false, |name| name == TSCONFIG_FILENAME);
            let b_is_main = b
                .file_name()
                .map_or(false, |name| name == TSCONFIG_FILENAME);
            match (a_is_main, b_is_main) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.cmp(b),
            }
        });
    }

    pub fn update_project_root(&mut self, new_root: PathBuf) {
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

    fn get_tsc_call(&self, flag: &str) -> String {
        // Build tsc command
        let mut command_parts = vec!["tsc".to_string()];

        if let Some(ref tsconfig) = self.selected_tsconfig {
            command_parts.push("--project".to_string());
            command_parts.push(quote_if_needed(&tsconfig.to_string_lossy()));
        }

        // Add configurable extra flags
        let extra_flag_parts: Vec<&str> = self
            .settings
            .extra_tsc_flags
            .trim()
            .split_whitespace()
            .collect();
        for part in extra_flag_parts {
            command_parts.push(part.to_string());
        }

        let flag_parts: Vec<&str> = flag.trim().split_whitespace().collect();
        for part in flag_parts {
            command_parts.push(part.to_string());
        }

        let full_command = command_parts.join(" ");
        format!("npm exec -- {}", full_command)
    }

    // Blocking helper that runs tsc directly
    fn run_typescript_with_flag_blocking(&self, flag: String, context: &str) -> Result<(), String> {
        let outputs_dir = self.outputs_dir().to_string_lossy().to_string();

        fs::create_dir_all(&outputs_dir)
            .map_err(|e| format!("Failed to create data directory: {e}"))?;

        self.process_controller.reset_cancel_flag();

        let npm_command = self.get_tsc_call(&flag);

        let cwd = self
            .project_root
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| "./".to_string());

        info!("Executing command: {}", npm_command);
        info!("Working directory: {}", cwd);
        info!("Outputs directory: {}", outputs_dir);

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

        self.process_controller.register_process(child.id());

        let output = child
            .wait_with_output()
            .map_err(|e| format!("Failed to wait for command completion: {e}"))?;

        let cancelled = self.process_controller.cancel_requested();
        self.process_controller.clear_current_process();
        self.process_controller.reset_cancel_flag();

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

    // Async helper to validate outputs in outputs_dir and return parsed results
    async fn validate_types_and_trace_async(
        outputs_dir: &str,
    ) -> Result<
        (
            TypesJsonSchema,
            Vec<crate::validate::trace_json::TraceEvent>,
        ),
        String,
    > {
        let types_path = std::path::Path::new(outputs_dir)
            .join(TYPES_JSON_FILENAME.trim_start_matches('/'))
            .to_string_lossy()
            .to_string();
        let trace_path = std::path::Path::new(outputs_dir)
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

    fn init_types_json(outputs_dir: &Path, project_root: &Path) -> TypesJsonSchema {
        // project_root is now package.json path, get directory
        let project_dir = project_root
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| PathBuf::from("."));

        let type_paths = [
            outputs_dir.join(TYPES_JSON_FILENAME.trim_start_matches('/')),
            project_dir.join(TYPES_JSON_FILENAME.trim_start_matches('/')),
        ];
        for p in type_paths.iter() {
            if p.exists() {
                let path_str = p.to_string_lossy();
                match std::fs::read_to_string(p)
                    .map_err(|e| e.to_string())
                    .and_then(|s| parse_types_json(&path_str, &s))
                {
                    Ok(parsed) => return parsed,
                    Err(e) => info!(
                        "Startup types.json ingestion failed at {}: {e}",
                        p.display()
                    ),
                }
            }
        }
        Vec::new()
    }

    fn init_trace_json(
        outputs_dir: &Path,
        project_root: &Path,
    ) -> Vec<crate::validate::trace_json::TraceEvent> {
        // project_root is now package.json path, get directory
        let project_dir = project_root
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| PathBuf::from("."));

        let trace_paths = [
            outputs_dir.join(TRACE_JSON_FILENAME.trim_start_matches('/')),
            project_dir.join(TRACE_JSON_FILENAME.trim_start_matches('/')),
        ];
        for p in trace_paths.iter() {
            if p.exists() {
                let path_str = p.to_string_lossy();
                match std::fs::read_to_string(p)
                    .map_err(|e| e.to_string())
                    .and_then(|s| parse_trace_json(&path_str, &s))
                {
                    Ok(parsed) => return parsed,
                    Err(e) => info!(
                        "Startup trace.json ingestion failed at {}: {e}",
                        p.display()
                    ),
                }
            }
        }
        Vec::new()
    }

    fn init_analyze_trace(outputs_dir: &Path) -> Option<crate::analyze_trace::AnalyzeTraceResult> {
        let analyze_path = outputs_dir.join(ANALYZE_TRACE_FILENAME);
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

    fn init_type_graph(outputs_dir: &Path) -> Option<crate::type_graph::TypeGraph> {
        let path = outputs_dir.join(crate::type_graph::TYPE_GRAPH_FILENAME.trim_start_matches('/'));
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

    fn init_cpu_profile(outputs_dir: &Path) -> Option<String> {
        let cpu_profile_path = outputs_dir.join(CPU_PROFILE_FILENAME);
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
        let pkg_path = &self.project_root;
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
    state: State<'_, Arc<Mutex<AppData>>>,
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
    outputs_dir: &'a str,
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

    pub fn update_outputs(&self) {
        let data_dir = &self.data_dir;
        let outputs_dir = self.outputs_dir();
        let config_path = data_dir.join(CONFIG_FILENAME);
        let types_path = outputs_dir.join(TYPES_JSON_FILENAME.trim_start_matches('/'));
        let trace_path = outputs_dir.join(TRACE_JSON_FILENAME.trim_start_matches('/'));
        let analyze_path = outputs_dir.join(ANALYZE_TRACE_FILENAME);
        let type_graph_path =
            outputs_dir.join(crate::type_graph::TYPE_GRAPH_FILENAME.trim_start_matches('/'));
        let cpu_path = outputs_dir.join(CPU_PROFILE_FILENAME);

        let outputs = OutputTimestamps {
            types_json: Self::file_mtime_iso(&types_path),
            trace_json: Self::file_mtime_iso(&trace_path),
            analyze_trace: Self::file_mtime_iso(&analyze_path),
            type_graph: Self::file_mtime_iso(&type_graph_path),
            cpu_profile: Self::file_mtime_iso(&cpu_path),
        };

        let cfg = TypeSlayerConfig {
            project_root: &self.project_root.to_string_lossy(),
            outputs_dir: &outputs_dir.to_string_lossy(),
            verbose: self.verbose,
            settings: &self.settings,
            outputs,
        };

        match toml::to_string(&cfg) {
            Ok(s) => {
                if let Err(e) = fs::create_dir_all(&outputs_dir) {
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

    pub fn clear_outputs_dir(&mut self) -> Result<(), String> {
        let outputs_dir = self.outputs_dir();

        fs::create_dir_all(&outputs_dir)
            .map_err(|e| format!("failed to ensure outputs directory exists: {e}"))?;

        if outputs_dir.exists() {
            for output_file in fs::read_dir(outputs_dir)
                .map_err(|e| format!("failed to read outputs directory: {e}"))?
            {
                let entry =
                    output_file.map_err(|e| format!("failed to inspect outputs entry: {e}"))?;
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

        self.update_outputs();
        Ok(())
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub relative_paths: bool,
    pub prefer_editor_open: bool,
    pub auto_start: bool,
    pub preferred_editor: Option<String>,
    pub extra_tsc_flags: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            relative_paths: true,
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
        let relative_paths = cake.resolve_bool(ResolveBoolArgs {
            env: "RELATIVE_PATHS",
            flag: "--relative-paths",
            file: "settings.relativePaths",
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
            relative_paths,
            prefer_editor_open,
            auto_start,
            preferred_editor,
            extra_tsc_flags,
        }
    }
}

#[tauri::command]
pub async fn validate_types_json(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<TypesJsonSchema, String> {
    let path = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.outputs_dir()
            .join(TYPES_JSON_FILENAME.trim_start_matches('/'))
            .to_string_lossy()
            .to_string()
    };
    let result = load_types_json(path).await?;
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.types_json = result.clone();
    Ok(result)
}

#[tauri::command]
pub async fn validate_trace_json(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<Vec<crate::validate::trace_json::TraceEvent>, String> {
    let path = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.outputs_dir()
            .join(TRACE_JSON_FILENAME.trim_start_matches('/'))
            .to_string_lossy()
            .to_string()
    };
    let result = read_trace_json(&path).await?;
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.trace_json = result.clone();
    Ok(result)
}

#[tauri::command]
pub async fn get_trace_json(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<Vec<crate::validate::trace_json::TraceEvent>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.trace_json.clone())
}

#[tauri::command]
pub async fn get_types_json(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<TypesJsonSchema, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.types_json.clone())
}

#[tauri::command]
pub async fn search_type(state: State<'_, Arc<Mutex<AppData>>>, id: i64) -> Result<Value, String> {
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
pub async fn get_tsconfig_paths(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<Vec<String>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data
        .tsconfig_paths
        .iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect())
}

#[tauri::command]
pub async fn get_selected_tsconfig(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<Option<String>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data
        .selected_tsconfig
        .as_ref()
        .map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn set_selected_tsconfig(
    state: State<'_, Arc<Mutex<AppData>>>,
    tsconfig_path: String,
) -> Result<(), String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;

    // Empty string means no tsconfig (valid)
    if tsconfig_path.is_empty() {
        data.selected_tsconfig = None;
        return Ok(());
    }

    // Validate that the path exists in discovered tsconfigs
    let path_buf = PathBuf::from(&tsconfig_path);
    if !data.tsconfig_paths.contains(&path_buf) {
        return Err(format!(
            "tsconfig '{}' not found in discovered paths",
            tsconfig_path
        ));
    }

    data.selected_tsconfig = Some(path_buf);
    Ok(())
}

#[tauri::command]
pub async fn clear_outputs(
    state: State<'_, Arc<Mutex<AppData>>>,
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
    data.clear_outputs_dir()
}

#[tauri::command]
pub async fn generate_trace(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<TypesJsonSchema, String> {
    // Clone the entire AppData to move into the blocking task
    let app_data_clone = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.clone()
    };
    let outputs_dir = app_data_clone.outputs_dir().to_string_lossy().to_string();

    info!("generate_trace: will write outputs under {}", outputs_dir);
    let outputs_dir_for_closure = outputs_dir.clone();
    let handle = tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let flag = make_cli_arg("--generateTrace", &outputs_dir_for_closure);
        app_data_clone
            .run_typescript_with_flag_blocking(flag, "TypeScript compilation with trace generation")
    });

    match handle.await {
        Ok(Ok(())) => {
            info!("Listing files in output directory: {}", outputs_dir);
            if let Ok(entries) = std::fs::read_dir(&outputs_dir) {
                for entry in entries.flatten() {
                    if let Ok(file_name) = entry.file_name().into_string() {
                        info!("  Found file: {}", file_name);
                    }
                }
            } else {
                info!("Could not read outputs directory: {}", outputs_dir);
            }

            let (types, trace) = AppData::validate_types_and_trace_async(&outputs_dir).await?;
            let mut data = state.lock().map_err(|e| e.to_string())?;
            data.types_json = types.clone();
            data.trace_json = trace;
            AppData::update_outputs(&data);
            Ok(types)
        }
        Ok(Err(e)) => Err(e),
        Err(e) => Err(format!("generate_trace join error: {}", e)),
    }
}

#[tauri::command]
pub async fn generate_cpu_profile(state: State<'_, Arc<Mutex<AppData>>>) -> Result<(), String> {
    let app_data_clone = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.clone()
    };
    let outputs_dir = app_data_clone.outputs_dir().to_string_lossy().to_string();

    info!(
        "generate_cpu_profile: will write profile under {}",
        outputs_dir
    );
    let outputs_dir_for_closure = outputs_dir.clone();
    let handle = tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let generation_path = Path::new(&outputs_dir_for_closure).join(CPU_PROFILE_FILENAME);
        let flag = make_cli_arg("--generateCpuProfile", &generation_path.to_string_lossy());
        app_data_clone.run_typescript_with_flag_blocking(flag, "TypeScript CPU profile run")
    });

    match handle.await {
        Ok(r) => {
            // On success, read and cache CPU profile contents
            if r.is_ok() {
                let path = Path::new(&outputs_dir).join(CPU_PROFILE_FILENAME);
                match tokio::fs::read_to_string(&path).await {
                    Ok(contents) => {
                        let mut data = state.lock().map_err(|e| e.to_string())?;
                        data.cpu_profile = Some(contents);
                        AppData::update_outputs(&data);
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
    state: State<'_, Arc<Mutex<AppData>>>,
    options: Option<crate::analyze_trace::AnalyzeTraceOptions>,
) -> Result<crate::analyze_trace::AnalyzeTraceResult, String> {
    info!("Starting analyze trace...");
    let outputs_dir = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.outputs_dir().to_string_lossy().to_string()
    };
    info!(
        "analyze_trace: reading inputs and writing output under {}",
        outputs_dir
    );

    let trace_dir_for_log = outputs_dir.clone();
    let handle = tauri::async_runtime::spawn_blocking(move || {
        match crate::analyze_trace::analyze_trace(&outputs_dir, options) {
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
                AppData::update_outputs(&data);
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
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<crate::analyze_trace::AnalyzeTraceResult, String> {
    // Serve cached value if present
    {
        let data = state.lock().map_err(|e| e.to_string())?;
        if let Some(result) = &data.analyze_trace {
            return Ok(result.clone());
        }
    }

    // Read from disk and cache
    let path = {
        let data = state.lock().map_err(|e| e.to_string())?;
        let outputs_dir = data.outputs_dir().to_string_lossy().to_string();
        Path::new(&outputs_dir).join(ANALYZE_TRACE_FILENAME)
    };
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
pub async fn get_cpu_profile(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<Option<String>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.cpu_profile.clone())
}

#[tauri::command]
pub async fn verify_analyze_trace(state: State<'_, Arc<Mutex<AppData>>>) -> Result<(), String> {
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
pub async fn verify_cpu_profile(state: State<'_, Arc<Mutex<AppData>>>) -> Result<(), String> {
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
pub async fn get_types_json_text(state: State<'_, Arc<Mutex<AppData>>>) -> Result<String, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    serde_json::to_string_pretty(&data.types_json).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_trace_json_text(state: State<'_, Arc<Mutex<AppData>>>) -> Result<String, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    serde_json::to_string_pretty(&data.trace_json).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_analyze_trace_text(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<String, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    match &data.analyze_trace {
        Some(v) => serde_json::to_string_pretty(v).map_err(|e| e.to_string()),
        None => Err("analyze-trace not loaded".to_string()),
    }
}

#[tauri::command]
pub async fn get_cpu_profile_text(state: State<'_, Arc<Mutex<AppData>>>) -> Result<String, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    match &data.cpu_profile {
        Some(contents) => serde_json::to_string_pretty(contents).map_err(|e| e.to_string()),
        None => Err("tsc.cpuprofile not loaded".to_string()),
    }
}

#[tauri::command]
pub async fn get_relative_paths(state: State<'_, Arc<Mutex<AppData>>>) -> Result<bool, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.settings.relative_paths)
}

#[tauri::command]
pub async fn set_relative_paths(
    state: State<'_, Arc<Mutex<AppData>>>,
    value: bool,
) -> Result<(), String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.settings.relative_paths = value;
    AppData::update_outputs(&data);
    Ok(())
}

#[tauri::command]
pub async fn get_prefer_editor_open(state: State<'_, Arc<Mutex<AppData>>>) -> Result<bool, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.settings.prefer_editor_open)
}

#[tauri::command]
pub async fn set_prefer_editor_open(
    state: State<'_, Arc<Mutex<AppData>>>,
    value: bool,
) -> Result<(), String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.settings.prefer_editor_open = value;
    AppData::update_outputs(&data);
    Ok(())
}

#[tauri::command]
pub async fn get_auto_start(state: State<'_, Arc<Mutex<AppData>>>) -> Result<bool, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.settings.auto_start)
}

#[tauri::command]
pub async fn set_auto_start(
    state: State<'_, Arc<Mutex<AppData>>>,
    value: bool,
) -> Result<(), String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.settings.auto_start = value;
    AppData::update_outputs(&data);
    Ok(())
}

#[tauri::command]
pub async fn open_file(state: State<'_, Arc<Mutex<AppData>>>, path: String) -> Result<(), String> {
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
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<Vec<(String, String)>, String> {
    let _ = state; // unused
    Ok(AVAILABLE_EDITORS
        .iter()
        .map(|(c, n)| (c.to_string(), n.to_string()))
        .collect())
}

#[tauri::command]
pub async fn get_preferred_editor(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<Option<String>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.settings.preferred_editor.clone())
}

#[tauri::command]
pub async fn set_preferred_editor(
    state: State<'_, Arc<Mutex<AppData>>>,
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
    AppData::update_outputs(&data);
    Ok(())
}

#[tauri::command]
pub async fn get_extra_tsc_flags(state: State<'_, Arc<Mutex<AppData>>>) -> Result<String, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.settings.extra_tsc_flags.clone())
}

#[tauri::command]
pub async fn get_default_extra_tsc_flags() -> Result<String, String> {
    Ok(Settings::default_extra_tsc_flags())
}

#[tauri::command]
pub async fn set_extra_tsc_flags(
    state: State<'_, Arc<Mutex<AppData>>>,
    flags: String,
) -> Result<(), String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.settings.extra_tsc_flags = flags;
    AppData::update_outputs(&data);
    Ok(())
}

#[tauri::command]
pub async fn get_treemap_data(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<Vec<crate::treemap::TreemapNode>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    let treemap_data = crate::treemap::build_treemap_from_trace(&data.trace_json)?;
    Ok(treemap_data)
}

#[tauri::command]
pub async fn get_tsc_example_call(state: State<'_, Arc<Mutex<AppData>>>) -> Result<String, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    let outputs_dir = data.outputs_dir().to_string_lossy().to_string();
    let flag = make_cli_arg("--generateTrace", outputs_dir.as_str());
    Ok(data.get_tsc_call(&flag))
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct BugReportFile {
    pub name: String,
    pub description: String,
}

#[tauri::command]
pub async fn get_bug_report_files(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<Vec<BugReportFile>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    let mut files = Vec::new();

    let outputs_dir = data.outputs_dir();

    // Check typescript.toml in data directory
    let typescript_toml_path = data.data_dir.join(CONFIG_FILENAME);
    if typescript_toml_path.exists() {
        files.push(BugReportFile {
            name: "typescript.toml".to_string(),
            description: "TypeScript configuration".to_string(),
        });
    }

    // Check output files only if they exist
    let output_files = [
        ("types.json", TYPES_JSON_FILENAME, "Type definitions data"),
        (
            "trace.json",
            TRACE_JSON_FILENAME,
            "Compilation trace events",
        ),
        (
            "analyze-trace.json",
            ANALYZE_TRACE_FILENAME,
            "Trace analysis results",
        ),
        (
            "type-graph.json",
            crate::type_graph::TYPE_GRAPH_FILENAME,
            "Type relationship graph",
        ),
        (
            "tsc.cpuprofile",
            CPU_PROFILE_FILENAME,
            "TypeScript CPU profile",
        ),
    ];

    for (zip_name, filename, description) in output_files {
        let file_path = outputs_dir.join(filename);
        if file_path.exists() {
            files.push(BugReportFile {
                name: zip_name.to_string(),
                description: description.to_string(),
            });
        }
    }

    // Check if package.json exists
    let project_root = &data.project_root;
    let pkg_json_path = project_root;
    if pkg_json_path.exists()
        && pkg_json_path.is_file()
        && pkg_json_path
            .file_name()
            .map(|f| f == PACKAGE_JSON_FILENAME)
            .unwrap_or(false)
    {
        files.push(BugReportFile {
            name: PACKAGE_JSON_FILENAME.to_string(),
            description: "Project package configuration".to_string(),
        });
    } else if pkg_json_path.is_dir() {
        let pkg_json_in_dir = pkg_json_path.join(PACKAGE_JSON_FILENAME);
        if pkg_json_in_dir.exists() {
            files.push(BugReportFile {
                name: PACKAGE_JSON_FILENAME.to_string(),
                description: "Project package configuration".to_string(),
            });
        }
    }

    // Check if selected tsconfig exists
    if let Some(tsconfig_path) = &data.selected_tsconfig {
        if tsconfig_path.exists() {
            let filename = tsconfig_path
                .file_name()
                .and_then(|f| f.to_str())
                .unwrap_or(TSCONFIG_FILENAME);
            files.push(BugReportFile {
                name: filename.to_string(),
                description: "TypeScript compiler configuration".to_string(),
            });
        }
    }

    Ok(files)
}

#[tauri::command]
pub async fn create_bug_report(
    state: State<'_, Arc<Mutex<AppData>>>,
    description: String,
    stdout: Option<String>,
    stderr: Option<String>,
) -> Result<String, String> {
    let data = state.lock().map_err(|e| e.to_string())?;

    // Create bug report zip file
    let downloads_dir =
        dirs::download_dir().ok_or_else(|| "Could not find downloads directory".to_string())?;

    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let zip_filename = format!("typeslayer_bug_report_{}.zip", timestamp);
    let zip_path = downloads_dir.join(&zip_filename);

    // Create the zip file
    let file = std::fs::File::create(&zip_path)
        .map_err(|e| format!("Failed to create zip file: {}", e))?;

    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // Add description as a text file
    zip.start_file("description", options)
        .map_err(|e| format!("Failed to add description file: {}", e))?;
    zip.write_all(description.as_bytes())
        .map_err(|e| format!("Failed to write description: {}", e))?;

    // Add stdout if provided
    if let Some(stdout_content) = stdout {
        zip.start_file("stdout", options)
            .map_err(|e| format!("Failed to add stdout file: {}", e))?;
        zip.write_all(stdout_content.as_bytes())
            .map_err(|e| format!("Failed to write stdout: {}", e))?;
    }

    // Add stderr if provided
    if let Some(stderr_content) = stderr {
        zip.start_file("stderr", options)
            .map_err(|e| format!("Failed to add stderr file: {}", e))?;
        zip.write_all(stderr_content.as_bytes())
            .map_err(|e| format!("Failed to write stderr: {}", e))?;
    }

    // Define the files to include
    let files_to_include = [
        CONFIG_FILENAME,
        TYPES_JSON_FILENAME,
        TRACE_JSON_FILENAME,
        ANALYZE_TRACE_FILENAME,
        crate::type_graph::TYPE_GRAPH_FILENAME,
        CPU_PROFILE_FILENAME,
    ];

    let outputs_dir = data.outputs_dir();

    // Add each file to the zip
    for filename in files_to_include {
        let file_path = if filename == CONFIG_FILENAME {
            // typescript.toml is in the data directory
            data.data_dir.join(filename)
        } else {
            // Other files are in the outputs directory
            outputs_dir.join(filename)
        };

        if file_path.exists() {
            let contents = std::fs::read(&file_path)
                .map_err(|e| format!("Failed to read {}: {}", filename, e))?;

            zip.start_file(filename, options)
                .map_err(|e| format!("Failed to add {} to zip: {}", filename, e))?;
            zip.write_all(&contents)
                .map_err(|e| format!("Failed to write {} to zip: {}", filename, e))?;
        }
    }

    zip.finish()
        .map_err(|e| format!("Failed to finalize zip file: {}", e))?;

    Ok(zip_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_data_dir(state: State<'_, Arc<Mutex<AppData>>>) -> Result<String, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.data_dir.to_string_lossy().to_string())
}
