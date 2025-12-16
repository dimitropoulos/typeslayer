use crate::{
    analyze_trace::{
        AnalyzeTraceOptions, AnalyzeTraceResult, analyze_trace, constants::ANALYZE_TRACE_FILENAME,
    },
    layercake::{LayerCake, LayerCakeInitArgs, ResolveBoolArgs, ResolveStringArgs, Source},
    process_controller::ProcessController,
    treemap::{TreemapNode, build_treemap_from_trace},
    type_graph::{
        LinkKind, TYPE_GRAPH_FILENAME, TypeGraph, get_relationships_for_type, human_readable_name,
    },
    utils::{
        OUTPUTS_DIRECTORY, PACKAGE_JSON_FILENAME, TSCONFIG_FILENAME, command_exists,
        get_output_file_preview, make_cli_arg, quote_if_needed,
    },
    validate::{
        trace_json::{TRACE_JSON_FILENAME, TraceEvent, parse_trace_json, read_trace_json},
        types_json::{
            ResolvedType, TYPES_JSON_FILENAME, TypesJsonSchema, parse_types_json,
            validate_types_json as load_types_json,
        },
        utils::{CPU_PROFILE_FILENAME, TypeId},
    },
};
use serde::Deserialize;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::{cmp::Ordering, path::PathBuf};
use std::{collections::HashMap, path::Path};
use std::{fmt::Display, fs};
use std::{
    fs::File,
    io::{BufReader, Write},
};
use tauri::{Manager, State};
use tracing::{debug, error, info};

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

struct TSCCommand {
    shell: String,     // The shell, e.g. `sh` or `cmd`
    shell_arg: String, // A arg for the shell like `-c` or `/c`.
    command: String,
    env: Vec<(String, String)>,
}

impl Display for TSCCommand {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        // Assumes POSIX-style environment. Can be adapted for Windows if needed.
        let mut env = self
            .env
            .iter()
            .map(|(key, value)| format!("{key}={}", quote_if_needed(&value)))
            .collect::<Vec<_>>()
            .join(" ");
        if env != "" {
            env += " ";
        }

        write!(f, "{}{}", env, self.command)
    }
}

#[derive(Clone, Debug)]
pub enum PackageManager {
    Bun,
    NPM,
    PNPM,
    Yarn,
}

#[derive(Clone)]
pub struct AppData {
    pub project_root: PathBuf,
    pub types_json: TypesJsonSchema,
    pub trace_json: Vec<TraceEvent>,
    pub analyze_trace: Option<AnalyzeTraceResult>,
    pub cpu_profile: Option<String>,
    pub tsconfig_paths: Vec<PathBuf>,
    pub selected_tsconfig: Option<PathBuf>,
    pub package_manager: PackageManager,
    pub settings: Settings,
    pub verbose: bool,
    pub cake: LayerCake,
    pub auth_code: Option<String>,
    pub type_graph: Option<TypeGraph>,
    pub process_controller: ProcessController,
    pub data_dir: PathBuf,
}

// The format of a package.json file with only what we care about.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PackageJSON {
    package_manager: Option<String>,
}

impl AppData {
    pub fn new(data_dir: PathBuf) -> Result<Self, String> {
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

        let package_manager = Self::find_package_manager(&project_root)?;

        let mut app = Self {
            project_root,
            package_manager,
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
        app.discover_tsconfigs()?;
        app.selected_tsconfig = Self::init_selected_tsconfig_with(&app.cake, &app.tsconfig_paths);
        Ok(app)
    }

    pub fn outputs_dir(&self) -> PathBuf {
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
            let pwd_path = Path::new(&pwd).join(PACKAGE_JSON_FILENAME);
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
        let p = Path::new(s);

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

    fn set_project_root(&mut self, new_root: PathBuf) -> Result<(), String> {
        if !new_root.exists() {
            self.selected_tsconfig = None;
            self.tsconfig_paths = vec![];
            self.project_root = PathBuf::from(".");
            return Err(format!(
                "project_root path does not exist: {}",
                new_root.display()
            ));
        }

        self.project_root = new_root;

        let package_manager = Self::find_package_manager(&self.project_root)?;
        self.package_manager = package_manager;

        let previous_selection = self.selected_tsconfig.clone();

        self.discover_tsconfigs()?;

        // Try to keep previous selection if it still exists
        if let Some(prev) = previous_selection {
            if self.tsconfig_paths.contains(&prev) {
                self.selected_tsconfig = Some(prev);
                return Ok(());
            }
        }

        // Otherwise, auto-detect
        self.selected_tsconfig =
            Self::init_selected_tsconfig_with(&self.cake, &self.tsconfig_paths);

        Ok(())
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
        tsconfig_paths: &[PathBuf],
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

    fn discover_tsconfigs(&mut self) -> Result<(), String> {
        self.tsconfig_paths.clear();

        // Get the directory containing the package.json
        let project_dir = self
            .project_root
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| PathBuf::from("."));

        // Search for tsconfig*.json files in the project directory and subdirectories
        let entries =
            fs::read_dir(&project_dir).map_err(|e| format!("Could not read dir {}", e))?;
        for entry in entries.flatten() {
            if let Ok(file_name) = entry.file_name().into_string() {
                if file_name.starts_with("tsconfig") && file_name.ends_with(".json") {
                    self.tsconfig_paths.push(entry.path());
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
                (true, false) => Ordering::Less,
                (false, true) => Ordering::Greater,
                _ => a.cmp(b),
            }
        });

        Ok(())
    }

    pub fn update_project_root(&mut self, new_root: PathBuf) -> Result<(), String> {
        if !new_root.exists() {
            self.selected_tsconfig = None;
            return Err(format!(
                "project_root path does not exist: {}",
                new_root.display()
            ));
        }

        self.project_root = new_root;

        let package_manager = Self::find_package_manager(&self.project_root)?;
        self.package_manager = package_manager;

        let previous_selection = self.selected_tsconfig.clone();

        self.discover_tsconfigs()?;

        // Try to keep previous selection if it still exists
        if let Some(prev) = previous_selection {
            if self.tsconfig_paths.contains(&prev) {
                self.selected_tsconfig = Some(prev);
                return Ok(());
            }
        }

        // Otherwise, auto-detect
        self.selected_tsconfig =
            Self::init_selected_tsconfig_with(&self.cake, &self.tsconfig_paths);

        Ok(())
    }

    fn get_tsc_call(&self, user_flags: &str) -> Result<TSCCommand, String> {
        let shell;
        let shell_arg;
        if cfg!(target_os = "windows") {
            shell = "cmd".to_string();
            shell_arg = "/c";
        } else {
            shell = "sh".to_string();
            shell_arg = "-c";
        };

        let mut args = vec![];
        match self.package_manager {
            PackageManager::Bun => args.extend(["bun", "x"]),
            PackageManager::NPM => args.extend(["npm", "exec"]),
            PackageManager::PNPM => args.extend(["pnpm", "exec"]),
            PackageManager::Yarn => args.extend(["yarn"]),
        };

        #[cfg(target_os = "windows")]
        args.push("\"--\""); // this is absolutely insane that this is required on windows.  how.  just HOW.
        #[cfg(not(target_os = "windows"))]
        args.push("--");
        args.push("tsc");

        if self.settings.extra_tsc_flags != "" {
            args.push(&self.settings.extra_tsc_flags);
        }

        if user_flags != "" {
            args.push(user_flags);
        }

        // Only here to satisfy lifetimes. Super let when?
        let max_stack_size_string: String;
        if let Some(size) = self.settings.max_stack_size {
            args.push("--stack-size");
            max_stack_size_string = size.to_string();
            args.push(&max_stack_size_string);
        }

        // Only here to satisfy lifetimes. Super let when?
        let tsconfig_string: String;
        if self.settings.apply_tsc_project_flag {
            if let Some(ref tsconfig) = self.selected_tsconfig {
                args.push("--project");

                tsconfig_string = quote_if_needed(&tsconfig.to_string_lossy().to_string());
                args.push(&tsconfig_string);
            }
        }

        let mut env = Vec::new();
        if self.settings.max_old_space_size.is_some() {
            let size = self.settings.max_old_space_size.unwrap();
            env.push((
                "NODE_OPTIONS".to_string(),
                format!("--max-old-space-size={size}"),
            ));
        }

        Ok(TSCCommand {
            shell,
            shell_arg: shell_arg.to_string(),
            command: args.join(" "),
            env,
        })
    }

    // Blocking helper that runs tsc directly
    fn run_tsc(&self, flag: String, context: &str) -> Result<(), String> {
        let outputs_dir = self.outputs_dir().to_string_lossy().to_string();

        fs::create_dir_all(&outputs_dir)
            .map_err(|e| format!("Failed to create data directory: {e}"))?;

        self.process_controller.reset_cancel_flag();

        let tsc_command = self.get_tsc_call(&flag)?;

        let cwd = self
            .project_root
            .parent()
            .ok_or_else(|| "project_root must be a package.json file")?;

        info!("[run_tsc] Executing command: {}", tsc_command);
        info!("[run_tsc] Working directory: {:?}", cwd);
        info!("[run_tsc] Outputs directory: {}", outputs_dir);

        let mut cmd = Command::new(tsc_command.shell);
        cmd.arg(tsc_command.shell_arg);

        // raw_arg makes sure a command like `npx tsc --project "foo bar"` is interpreted by the shell.
        // The default with `.arg`, on Windows, is more like `npx tsc --project "\"foo bar\""` but shell quoting is more complicated.
        #[cfg(target_os = "windows")]
        cmd.raw_arg(format!("\"{}\"", tsc_command.command));

        #[cfg(not(target_os = "windows"))]
        cmd.arg(tsc_command.command);

        cmd.current_dir(&cwd)
            .envs(tsc_command.env)
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
    ) -> Result<(TypesJsonSchema, Vec<TraceEvent>), String> {
        let types_path = Path::new(outputs_dir)
            .join(TYPES_JSON_FILENAME.trim_start_matches('/'))
            .to_string_lossy()
            .to_string();
        let trace_path = Path::new(outputs_dir)
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
                "[init_types_json] types.json validation failed: {}\nExpected file at: {}",
                e, types_path
            )
        })?;
        let trace = trace_res.map_err(|e| {
            format!(
                "[init_trace_json] trace.json validation failed: {}\nExpected file at: {}",
                e, trace_path
            )
        })?;
        debug!(
            "[validate_types_and_trace_async] Loaded types.json ({} types) and trace.json ({} events)",
            types.len(),
            trace.len()
        );
        Ok((types, trace))
    }

    fn init_types_json(outputs_dir: &Path, project_root: &Path) -> TypesJsonSchema {
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
                    Ok(parsed) => {
                        debug!("[init_types_json] Loaded types.json from {}", p.display());
                        return parsed;
                    }
                    Err(e) => info!(
                        "[init_types_json] Startup types.json ingestion failed at {}: {e}",
                        p.display()
                    ),
                }
            }
        }
        debug!("[init_types_json] No valid types.json found at startup");
        Vec::new()
    }

    fn init_trace_json(outputs_dir: &Path, project_root: &Path) -> Vec<TraceEvent> {
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
                    Ok(parsed) => {
                        debug!("[init_trace_json] Loaded trace.json from {}", p.display());
                        return parsed;
                    }
                    Err(e) => info!(
                        "[init_trace_json] Startup trace.json ingestion failed at {}: {e}",
                        p.display()
                    ),
                }
            }
        }
        debug!("[init_trace_json] No valid trace.json found at startup");
        Vec::new()
    }

    fn init_analyze_trace(outputs_dir: &Path) -> Option<AnalyzeTraceResult> {
        let analyze_path = outputs_dir.join(ANALYZE_TRACE_FILENAME);
        if analyze_path.exists() {
            match std::fs::read_to_string(&analyze_path)
                .map_err(|e| e.to_string())
                .and_then(|s| {
                    serde_json::from_str::<AnalyzeTraceResult>(&s).map_err(|e| e.to_string())
                }) {
                Ok(parsed) => {
                    debug!(
                        "[init_analyze_trace] Loaded from {}",
                        analyze_path.display()
                    );
                    return Some(parsed);
                }
                Err(e) => info!(
                    "[init_analyze_trace] Startup ingestion failed at {}: {}",
                    analyze_path.display(),
                    e
                ),
            }
        }
        debug!("[init_analyze_trace] No valid analyze-trace.json found at startup");
        None
    }

    fn init_type_graph(outputs_dir: &Path) -> Option<TypeGraph> {
        let path = outputs_dir.join(TYPE_GRAPH_FILENAME.trim_start_matches('/'));
        if path.exists() {
            match std::fs::read_to_string(&path)
                .map_err(|e| e.to_string())
                .and_then(|s| serde_json::from_str::<TypeGraph>(&s).map_err(|e| e.to_string()))
            {
                Ok(parsed) => {
                    debug!(
                        "[init_type_graph] Loaded type-graph.json from {}",
                        path.display()
                    );
                    return Some(parsed);
                }
                Err(e) => info!(
                    "[init_type_graph] Startup type-graph ingestion failed at {}: {}",
                    path.display(),
                    e
                ),
            }
        }
        debug!("[init_type_graph] No valid type-graph.json found at startup");
        None
    }

    fn init_cpu_profile(outputs_dir: &Path) -> Option<String> {
        let cpu_profile_path = outputs_dir.join(CPU_PROFILE_FILENAME);
        if cpu_profile_path.exists() {
            match std::fs::read_to_string(&cpu_profile_path) {
                Ok(contents) => {
                    debug!(
                        "[init_cpu_profile] Loaded CPU profile from {}",
                        cpu_profile_path.display()
                    );
                    return Some(contents);
                }
                Err(e) => info!(
                    "[init_cpu_profile] Startup CPU profile ingestion failed at {}: {}",
                    cpu_profile_path.display(),
                    e
                ),
            }
        }
        debug!("[init_cpu_profile] No valid CPU profile found at startup");
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
        let type_graph_path = outputs_dir.join(TYPE_GRAPH_FILENAME.trim_start_matches('/'));
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
                } else {
                    debug!(
                        "[update_outputs] Wrote updated config to {}",
                        config_path.display()
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
            for output_file in fs::read_dir(&outputs_dir)
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
        debug!(
            "[clear_outputs_dir] Cleared outputs directory: {}",
            outputs_dir.display()
        );
        self.update_outputs();
        Ok(())
    }

    fn find_package_manager(project_root: &Path) -> Result<PackageManager, String> {
        let package_json = File::open(project_root)
            .map_err(|e| format!("could not open {}: {e}", project_root.to_string_lossy()))?;
        let package_json: PackageJSON =
            serde_json::from_reader(BufReader::new(package_json)).map_err(|e| format!("{e}"))?;

        match package_json.package_manager {
            Some(package_manager) => {
                let package_manager = package_manager
                    .split("@")
                    .next()
                    .unwrap_or(&package_manager);
                let result = match package_manager {
                    "npm" => Ok(PackageManager::NPM),
                    "pnpm" => Ok(PackageManager::PNPM),
                    "yarn" => Ok(PackageManager::Yarn),
                    "bun" => Ok(PackageManager::Bun),
                    _ => Err(format!("Unsupported packageManager {package_manager}")),
                };
                debug!(
                    "[find_package_manager] Detected packageManager '{}' in {}, using {:?}",
                    package_manager,
                    project_root.display(),
                    result.as_ref().ok()
                );
                result
            }
            None => {
                info!(
                    "[find_package_manager] No packageManager field in {}, defaulting to npm",
                    project_root.display()
                );
                return Ok(PackageManager::NPM);
            }
        }
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
    pub apply_tsc_project_flag: bool,
    pub max_old_space_size: Option<i32>,
    pub max_stack_size: Option<i32>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            relative_paths: true,
            prefer_editor_open: true,
            auto_start: true,
            preferred_editor: Some("code".to_string()),
            extra_tsc_flags: "--noEmit --incremental false --noErrorTruncation".to_string(),
            apply_tsc_project_flag: true,
            max_old_space_size: None,
            max_stack_size: None,
        }
    }
}

impl Settings {
    pub fn default_extra_tsc_flags() -> String {
        debug!("[default_extra_tsc_flags] requested default extra tsc flags");
        return "--noEmit --incremental false --noErrorTruncation".to_string();
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
        let apply_tsc_project_flag = cake.resolve_bool(ResolveBoolArgs {
            env: "APPLY_TSC_PROJECT_FLAG",
            flag: "--apply-tsc-project-flag",
            file: "settings.applyTscProjectFlag",
            default: || true,
        });
        let max_old_space_size = {
            let val = cake.resolve_string(ResolveStringArgs {
                env: "MAX_OLD_SPACE_SIZE",
                flag: "--max-old-space-size",
                file: "settings.maxOldSpaceSize",
                default: || "".to_string(),
                validate: |s| {
                    if s.is_empty() {
                        Ok(s.to_string())
                    } else {
                        s.parse::<i32>()
                            .map(|_| s.to_string())
                            .map_err(|e| format!("Invalid maxOldSpaceSize value '{}': {}", s, e))
                    }
                },
            });
            if val.is_empty() {
                None
            } else {
                Some(val.parse::<i32>().unwrap())
            }
        };

        let max_stack_size = {
            let val = cake.resolve_string(ResolveStringArgs {
                env: "MAX_STACK_SIZE",
                flag: "--max-stack-size",
                file: "settings.maxStackSize",
                default: || "".to_string(),
                validate: |s| {
                    if s.is_empty() {
                        Ok(s.to_string())
                    } else {
                        s.parse::<i32>()
                            .map(|_| s.to_string())
                            .map_err(|e| format!("Invalid maxStackSize value '{}': {}", s, e))
                    }
                },
            });
            if val.is_empty() {
                None
            } else {
                Some(val.parse::<i32>().unwrap())
            }
        };
        Settings {
            relative_paths,
            prefer_editor_open,
            auto_start,
            preferred_editor,
            extra_tsc_flags,
            apply_tsc_project_flag,
            max_old_space_size,
            max_stack_size,
        }
    }
}

#[tauri::command]
pub async fn validate_types_json(state: State<'_, Arc<Mutex<AppData>>>) -> Result<(), String> {
    let path = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.outputs_dir()
            .join(TYPES_JSON_FILENAME.trim_start_matches('/'))
            .to_string_lossy()
            .to_string()
    };
    load_types_json(path).await?;
    Ok(())
}

#[tauri::command]
pub async fn validate_trace_json(state: State<'_, Arc<Mutex<AppData>>>) -> Result<(), String> {
    let path = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.outputs_dir()
            .join(TRACE_JSON_FILENAME.trim_start_matches('/'))
            .to_string_lossy()
            .to_string()
    };
    read_trace_json(&path).await?;
    Ok(())
}

#[tauri::command]
pub async fn get_trace_json(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<Vec<TraceEvent>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    debug!(
        "[get_trace_json] returning {} trace events",
        data.trace_json.len()
    );
    Ok(data.trace_json.clone())
}

#[tauri::command]
pub async fn get_types_json(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<TypesJsonSchema, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    debug!("[get_types_json] returning {} types", data.types_json.len());
    Ok(data.types_json.clone())
}

#[tauri::command]
pub async fn get_tsconfig_paths(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<Vec<String>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    debug!(
        "[get_tsconfig_paths] returning {} tsconfig paths",
        data.tsconfig_paths.len()
    );
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
    debug!(
        "[get_selected_tsconfig] returning selected tsconfig = {:?}",
        data.selected_tsconfig
    );
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
        debug!("[set_selected_tsconfig] selected tsconfig set to None (empty string provided)");
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
    debug!(
        "[set_selected_tsconfig] selected tsconfig set to {:?}",
        data.selected_tsconfig
    );
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
pub async fn generate_trace(state: State<'_, Arc<Mutex<AppData>>>) -> Result<(), String> {
    // Clone the entire AppData to move into the blocking task
    let app_data_clone = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.clone()
    };
    let outputs_dir = app_data_clone.outputs_dir().to_string_lossy().to_string();

    info!("[generate_trace] will write outputs under {}", outputs_dir);
    let outputs_dir_for_closure = outputs_dir.clone();
    let handle = tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let flag = make_cli_arg("--generateTrace", &outputs_dir_for_closure);
        app_data_clone.run_tsc(flag, "TypeScript compilation with trace generation")
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
            debug!(
                "[generate_trace] cached {} types and {} trace events",
                data.types_json.len(),
                data.trace_json.len()
            );
            Ok(())
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
        "[generate_cpu_profile]: will write profile under {}",
        outputs_dir
    );
    let outputs_dir_for_closure = outputs_dir.clone();
    let handle = tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let generation_path = Path::new(&outputs_dir_for_closure).join(CPU_PROFILE_FILENAME);
        let flag = make_cli_arg("--generateCpuProfile", &generation_path.to_string_lossy());
        app_data_clone.run_tsc(flag, "TypeScript CPU profile run")
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
                        debug!(
                            "[generate_cpu_profile] cached CPU profile of size {} bytes",
                            data.cpu_profile.as_ref().map_or(0, |s| s.len())
                        );
                        AppData::update_outputs(&data);
                    }
                    Err(e) => error!("Failed to read CPU profile after generation: {}", e),
                }
            }
            debug!("[generate_cpu_profile] completed with result {:?}", r);
            r
        }
        Err(e) => Err(format!("[generate_cpu_profile] join error: {}", e)),
    }
}

#[tauri::command]
pub async fn generate_analyze_trace(
    state: State<'_, Arc<Mutex<AppData>>>,
    options: Option<AnalyzeTraceOptions>,
) -> Result<(), String> {
    let outputs_dir = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.outputs_dir().to_string_lossy().to_string()
    };
    debug!(
        "[generate_analyze_trace] reading inputs and writing output under {}",
        outputs_dir
    );

    let trace_dir_for_log = outputs_dir.clone();
    let handle =
        tauri::async_runtime::spawn_blocking(move || match analyze_trace(&outputs_dir, options) {
            Ok(result) => {
                debug!("[generate_analyze_trace] Analyze trace completed successfully");
                Ok::<AnalyzeTraceResult, String>(result)
            }
            Err(e) => {
                error!("Analyze trace failed: {}", e);
                Err(e)
            }
        });

    match handle.await {
        Ok(r) => {
            if let Ok(res) = &r {
                let mut data = state.lock().map_err(|e| e.to_string())?;
                data.analyze_trace = Some(res.clone());
                AppData::update_outputs(&data);
                debug!(
                    "[generate_analyze_trace] wrote {} in {}",
                    ANALYZE_TRACE_FILENAME, trace_dir_for_log
                );
            }
            debug!("[generate_analyze_trace] completed");
            Ok(())
        }
        Err(e) => Err(format!("[generate_analyze_trace] join error: {}", e)),
    }
}

#[tauri::command]
pub async fn get_analyze_trace(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<AnalyzeTraceResult, String> {
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
    let parsed: AnalyzeTraceResult = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))?;
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.analyze_trace = Some(parsed.clone());
    debug!(
        "[get_analyze_trace] loaded analyze trace from disk with size {} bytes",
        contents.len()
    );
    Ok(parsed)
}

#[tauri::command]
pub async fn get_cpu_profile(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<Option<String>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    debug!(
        "[get_cpu_profile] returning CPU profile of size {} bytes",
        data.cpu_profile.as_ref().map_or(0, |s| s.len())
    );
    Ok(data.cpu_profile.clone())
}

#[tauri::command]
pub async fn verify_analyze_trace(state: State<'_, Arc<Mutex<AppData>>>) -> Result<(), String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    match &data.analyze_trace {
        Some(v) => {
            let json = serde_json::to_string(v).map_err(|e| e.to_string())?;
            if json.trim().is_empty() {
                Err(format!("{} appears empty", ANALYZE_TRACE_FILENAME).to_string())
            } else {
                debug!(
                    "[verify_analyze_trace] {} has size {} bytes",
                    ANALYZE_TRACE_FILENAME,
                    json.len()
                );
                Ok(())
            }
        }
        None => Err(format!("{} not loaded", ANALYZE_TRACE_FILENAME).to_string()),
    }
}

#[tauri::command]
pub async fn verify_trace_json(state: State<'_, Arc<Mutex<AppData>>>) -> Result<(), String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    if data.trace_json.is_empty() {
        Err(format!("{} is empty", TRACE_JSON_FILENAME).to_string())
    } else {
        debug!("[verify_trace_json] {} trace events", data.trace_json.len());
        Ok(())
    }
}

#[tauri::command]
pub async fn verify_types_json(state: State<'_, Arc<Mutex<AppData>>>) -> Result<(), String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    if data.types_json.is_empty() {
        Err(format!("{} is empty", TYPES_JSON_FILENAME).to_string())
    } else {
        debug!("[verify_types_json] {} types", data.types_json.len());
        Ok(())
    }
}

#[tauri::command]
pub async fn verify_cpu_profile(state: State<'_, Arc<Mutex<AppData>>>) -> Result<(), String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    match &data.cpu_profile {
        Some(contents) => {
            if contents.trim().is_empty() {
                Err(format!("{} is empty", CPU_PROFILE_FILENAME).to_string())
            } else {
                debug!("[verify_cpu_profile] size {} bytes", contents.len());
                Ok(())
            }
        }
        None => Err(format!("{} not loaded", CPU_PROFILE_FILENAME).to_string()),
    }
}

#[tauri::command]
pub async fn get_types_json_preview(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<String, String> {
    let filepath = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.outputs_dir().join(TYPES_JSON_FILENAME)
    };
    get_output_file_preview(&filepath).await
}

#[tauri::command]
pub async fn get_trace_json_preview(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<String, String> {
    let filepath = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.outputs_dir().join(TRACE_JSON_FILENAME)
    };

    get_output_file_preview(&filepath).await
}

#[tauri::command]
pub async fn get_analyze_trace_preview(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<String, String> {
    let filepath = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.outputs_dir().join(ANALYZE_TRACE_FILENAME)
    };
    get_output_file_preview(&filepath).await
}

#[tauri::command]
pub async fn get_cpu_profile_preview(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<String, String> {
    let filepath = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.outputs_dir().join(CPU_PROFILE_FILENAME)
    };
    get_output_file_preview(&filepath).await
}

#[tauri::command]
pub async fn get_relative_paths(state: State<'_, Arc<Mutex<AppData>>>) -> Result<bool, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    debug!(
        "[get_relative_paths] returning {}",
        data.settings.relative_paths
    );
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
    debug!("[set_relative_paths] set to {}", value);
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
    if !Path::new(&file_path).exists() {
        return Err(format!("Path does not exist: {file_path}"));
    }

    let handle = tauri::async_runtime::spawn_blocking(move || {
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
pub async fn get_apply_tsc_project_flag(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<bool, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.settings.apply_tsc_project_flag)
}

#[tauri::command]
pub async fn set_apply_tsc_project_flag(
    state: State<'_, Arc<Mutex<AppData>>>,
    value: bool,
) -> Result<(), String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.settings.apply_tsc_project_flag = value;
    AppData::update_outputs(&data);
    Ok(())
}

#[tauri::command]
pub async fn get_treemap_data(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<Vec<TreemapNode>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    let treemap_data = build_treemap_from_trace(&data.trace_json)?;
    Ok(treemap_data)
}

#[tauri::command]
pub async fn get_tsc_example_call(state: State<'_, Arc<Mutex<AppData>>>) -> Result<String, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    let outputs_dir = data.outputs_dir().to_string_lossy().to_string();
    let flag = make_cli_arg("--generateTrace", outputs_dir.as_str());
    Ok(data.get_tsc_call(&flag)?.to_string())
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
            TYPE_GRAPH_FILENAME,
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
        TYPE_GRAPH_FILENAME,
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

// Helper function for common upload validation and file operations
async fn upload_file_with_validation<T, F, U>(
    file_path: &str,
    dest_filename: &str,
    parser: F,
    state_updater: U,
    state: &State<'_, Arc<Mutex<AppData>>>,
) -> Result<T, String>
where
    T: Clone,
    F: Fn(&str, &str) -> Result<T, String>,
    U: Fn(&mut AppData, T) -> (),
{
    use Path;

    let path = Path::new(file_path);
    if !path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }

    // Read and validate the file
    let contents = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let parsed_data = parser(file_path, &contents)?;

    // Copy file to outputs directory
    let outputs_dir = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.outputs_dir()
    };

    tokio::fs::create_dir_all(&outputs_dir)
        .await
        .map_err(|e| format!("Failed to create outputs directory: {}", e))?;

    let dest = outputs_dir.join(dest_filename);
    tokio::fs::copy(&path, &dest)
        .await
        .map_err(|e| format!("Failed to copy file: {}", e))?;

    // Update state
    {
        let mut data = state.lock().map_err(|e| e.to_string())?;
        state_updater(&mut data, parsed_data.clone());
        AppData::update_outputs(&data);
    }

    Ok(parsed_data)
}

// Helper to regenerate analyze trace and type graph after upload
fn regenerate_analysis_after_upload(state: &State<'_, Arc<Mutex<AppData>>>) -> Result<(), String> {
    let outputs_dir = state
        .lock()
        .map_err(|e| e.to_string())?
        .outputs_dir()
        .to_string_lossy()
        .to_string();

    // Regenerate analyze trace
    let analyze_result = analyze_trace(&outputs_dir, None);
    if let Ok(result) = analyze_result {
        let mut data = state.lock().map_err(|e| e.to_string())?;
        data.analyze_trace = Some(result);
    }

    // Generate type graph if both trace and types are available
    let should_generate_graph = {
        let data = state.lock().map_err(|e| e.to_string())?;
        !data.trace_json.is_empty() && !data.types_json.is_empty()
    };

    if should_generate_graph {
        let types = {
            let data = state.lock().map_err(|e| e.to_string())?;
            data.types_json.clone()
        };

        let graph = TypeGraph::from_types(&types);

        // Store in AppData and persist to disk
        {
            let mut data = state.lock().map_err(|e| e.to_string())?;
            data.type_graph = Some(graph);

            // Persist to outputs/type-graph.json
            let outputs_dir = data.outputs_dir();
            let path = outputs_dir.join(TYPE_GRAPH_FILENAME);
            let json = serde_json::to_string_pretty(&data.type_graph)
                .map_err(|e| format!("Failed to serialize type_graph: {}", e))?;

            std::fs::create_dir_all(&outputs_dir)
                .map_err(|e| format!("Failed to create outputs directory: {}", e))?;
            std::fs::write(&path, json)
                .map_err(|e| format!("Failed to write type-graph.json: {}", e))?;
        }
    }

    // Update outputs after regeneration
    let data = state.lock().map_err(|e| e.to_string())?;
    AppData::update_outputs(&data);
    Ok(())
}

// Helper to find paired trace/types files
fn find_paired_file(path: &Path, from: &str, to: &str) -> PathBuf {
    let default_name = format!("{}.json", from);
    let filename = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(&default_name);
    let paired_filename = filename.replace(from, to);
    path.parent()
        .unwrap_or(Path::new("."))
        .join(paired_filename)
}

#[tauri::command]
pub async fn upload_trace_json(
    state: State<'_, Arc<Mutex<AppData>>>,
    file_path: String,
) -> Result<(), String> {
    use Path;

    let _trace_events = upload_file_with_validation(
        &file_path,
        TRACE_JSON_FILENAME,
        |path, contents| {
            parse_trace_json(path, contents)
                .map_err(|e| format!("Invalid trace.json format: {}", e))
        },
        |data, parsed| {
            data.trace_json = parsed;
            data.analyze_trace = None;
            data.type_graph = None;
        },
        &state,
    )
    .await?;

    // Handle paired types file
    let path = Path::new(&file_path);
    let types_path = find_paired_file(path, "trace", "types");
    if types_path.exists() {
        upload_file_with_validation(
            &types_path.to_string_lossy(),
            TYPES_JSON_FILENAME,
            |path, contents| {
                parse_types_json(path, contents)
                    .map_err(|e| format!("Invalid types.json format: {}", e))
            },
            |data, parsed| {
                data.types_json = parsed;
            },
            &state,
        )
        .await?;
    };

    // Regenerate analyze trace and type graph after upload
    if let Err(e) = regenerate_analysis_after_upload(&state) {
        tracing::warn!("Failed to regenerate analysis after trace upload: {}", e);
    }

    Ok(())
}

#[tauri::command]
pub async fn upload_types_json(
    state: State<'_, Arc<Mutex<AppData>>>,
    file_path: String,
) -> Result<(), String> {
    use Path;

    let _types_json = upload_file_with_validation(
        &file_path,
        TYPES_JSON_FILENAME,
        |path, contents| {
            parse_types_json(path, contents)
                .map_err(|e| format!("Invalid types.json format: {}", e))
        },
        |data, parsed| {
            data.types_json = parsed;
            data.analyze_trace = None;
            data.type_graph = None;
        },
        &state,
    )
    .await?;

    // Handle paired trace file
    let path = Path::new(&file_path);
    let trace_path = find_paired_file(path, "types", "trace");
    if trace_path.exists() {
        upload_file_with_validation(
            &trace_path.to_string_lossy(),
            TRACE_JSON_FILENAME,
            |path, contents| {
                parse_trace_json(path, contents)
                    .map_err(|e| format!("Invalid trace.json format: {}", e))
            },
            |data, parsed| {
                data.trace_json = parsed;
            },
            &state,
        )
        .await?;
    };

    // Regenerate analyze trace and type graph after upload
    if let Err(e) = regenerate_analysis_after_upload(&state) {
        tracing::warn!("Failed to regenerate analysis after types upload: {}", e);
    }

    Ok(())
}

#[tauri::command]
pub async fn upload_cpu_profile(
    state: State<'_, Arc<Mutex<AppData>>>,
    file_path: String,
) -> Result<(), String> {
    upload_file_with_validation(
        &file_path,
        CPU_PROFILE_FILENAME,
        |_path, contents| {
            serde_json::from_str::<serde_json::Value>(contents)
                .map_err(|e| format!("Invalid CPU profile format (not valid JSON): {}", e))?;
            Ok(contents.to_string())
        },
        |data, contents| {
            data.cpu_profile = Some(contents);
        },
        &state,
    )
    .await?;

    Ok(())
}

#[tauri::command]
pub async fn upload_analyze_trace(
    state: State<'_, Arc<Mutex<AppData>>>,
    file_path: String,
) -> Result<(), String> {
    upload_file_with_validation(
        &file_path,
        ANALYZE_TRACE_FILENAME,
        |_path, contents| {
            serde_json::from_str::<AnalyzeTraceResult>(contents)
                .map_err(|e| format!("Invalid analyze trace format: {}", e))
        },
        |data, result| {
            data.analyze_trace = Some(result);
        },
        &state,
    )
    .await?;

    Ok(())
}

#[tauri::command]
pub async fn upload_type_graph(
    state: State<'_, Arc<Mutex<AppData>>>,
    file_path: String,
) -> Result<(), String> {
    upload_file_with_validation(
        &file_path,
        TYPE_GRAPH_FILENAME.trim_start_matches('/'),
        |_path, contents| {
            serde_json::from_str::<TypeGraph>(contents)
                .map_err(|e| format!("Invalid type graph format: {}", e))
        },
        |data, graph| {
            data.type_graph = Some(graph);
        },
        &state,
    )
    .await?;

    Ok(())
}

#[tauri::command]
pub async fn get_max_old_space_size(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<Option<i32>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.settings.max_old_space_size)
}

#[tauri::command]
pub async fn set_max_old_space_size(
    state: State<'_, Arc<Mutex<AppData>>>,
    size: Option<i32>,
) -> Result<(), String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.settings.max_old_space_size = size;
    AppData::update_outputs(&data);
    Ok(())
}

#[tauri::command]
pub async fn get_max_stack_size(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<Option<i32>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(data.settings.max_stack_size)
}

#[tauri::command]
pub async fn set_max_stack_size(
    state: State<'_, Arc<Mutex<AppData>>>,
    size: Option<i32>,
) -> Result<(), String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.settings.max_stack_size = size;
    AppData::update_outputs(&data);
    Ok(())
}

#[tauri::command]
pub async fn get_project_root(state: State<'_, Arc<Mutex<AppData>>>) -> Result<String, String> {
    state
        .lock()
        .map(|data| data.project_root.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_project_root(
    state: State<'_, Arc<Mutex<AppData>>>,
    project_root: String,
) -> Result<(), String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;
    let path_buf = PathBuf::from(project_root.clone());
    data.set_project_root(path_buf)?;
    Ok(())
}

#[tauri::command]
pub async fn get_current_dir() -> Result<String, String> {
    if let Ok(user_cwd) = std::env::var("USER_CWD") {
        return Ok(user_cwd);
    }

    std::env::current_dir()
        .map(|path| path.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

pub fn get_typeslayer_base_data_dir() -> PathBuf {
    if let Ok(env_dir) = std::env::var("TYPESLAYER_DATA_DIR") {
        PathBuf::from(env_dir)
    } else {
        #[cfg(target_os = "linux")]
        {
            if let Ok(home) = std::env::var("HOME") {
                return PathBuf::from(format!("{}/.local/share/typeslayer", home));
            }
        }
        #[cfg(target_os = "macos")]
        {
            if let Ok(home) = std::env::var("HOME") {
                return PathBuf::from(format!("{}/Library/Application Support/typeslayer", home));
            }
        }
        #[cfg(target_os = "windows")]
        {
            if let Ok(appdata) = std::env::var("APPDATA") {
                return PathBuf::from(format!("{}\\typeslayer", appdata));
            }
        }
        std::env::current_dir()
            .unwrap_or(PathBuf::from("."))
            .join("typeslayer")
    }
}

#[tauri::command]
pub async fn get_output_file_sizes(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<HashMap<String, u64>, String> {
    use std::fs;

    let outputs_dir = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.outputs_dir().to_string_lossy().to_string()
    };

    let filenames = vec![
        ANALYZE_TRACE_FILENAME,
        TRACE_JSON_FILENAME,
        TYPES_JSON_FILENAME,
        CPU_PROFILE_FILENAME,
        TYPE_GRAPH_FILENAME,
    ];

    let mut sizes = HashMap::new();

    for filename in filenames {
        let path = Path::new(&outputs_dir).join(filename);
        if let Ok(metadata) = fs::metadata(&path) {
            sizes.insert(filename.to_string(), metadata.len());
        }
    }

    Ok(sizes)
}

#[tauri::command]
pub async fn get_traces_related_to_typeid(
    state: State<'_, Arc<Mutex<AppData>>>,
    type_id: usize,
) -> Result<Vec<TraceEvent>, String> {
    let typeid = type_id as i64;
    let data = state.lock().map_err(|e| e.to_string())?;
    let events = data
        .trace_json
        .iter()
        .filter(|event| match event.name.as_str() {
            "checkTypeParameterDeferred" => {
                event.args.get("parent").and_then(|v| v.as_i64()) == Some(typeid)
                    || event.args.get("id").and_then(|v| v.as_i64()) == Some(typeid)
            }
            "checkTypeRelatedTo_DepthLimit"
            | "structuredTypeRelatedTo"
            | "traceUnionsOrIntersectionsTooLarge_DepthLimit"
            | "typeRelatedToDiscriminatedType_DepthLimit" => {
                event.args.get("sourceId").and_then(|v| v.as_i64()) == Some(typeid)
                    || event.args.get("targetId").and_then(|v| v.as_i64()) == Some(typeid)
            }
            "checkCrossProductUnion_DepthLimit" | "removeSubtypes_DepthLimit" => event
                .args
                .get("typeIds")
                .and_then(|v| v.as_array())
                .map_or(false, |arr| arr.iter().any(|v| v.as_i64() == Some(typeid))),
            "instantiateType_DepthLimit" => {
                event.args.get("typeId").and_then(|v| v.as_i64()) == Some(typeid)
            }
            "recursiveTypeRelatedTo_DepthLimit" => {
                event.args.get("sourceId").and_then(|v| v.as_i64()) == Some(typeid)
                    || event.args.get("targetId").and_then(|v| v.as_i64()) == Some(typeid)
                    || event
                        .args
                        .get("sourceIdStack")
                        .and_then(|v| v.as_array())
                        .map_or(false, |arr| arr.iter().any(|v| v.as_i64() == Some(typeid)))
                    || event
                        .args
                        .get("targetIdStack")
                        .and_then(|v| v.as_array())
                        .map_or(false, |arr| arr.iter().any(|v| v.as_i64() == Some(typeid)))
            }
            _ => false,
        })
        .cloned()
        .collect();
    Ok(events)
}

#[tauri::command]
pub async fn get_links_to_type_id(
    state: State<'_, Arc<Mutex<AppData>>>,
    type_id: usize,
) -> Result<Vec<(LinkKind, Vec<(TypeId, String)>)>, String> {
    let data = state.lock().map_err(|e| e.to_string())?;

    let mut links_by_kind = HashMap::<LinkKind, Vec<(TypeId, String)>>::new();
    if let Some(graph) = &data.type_graph {
        for link in graph.links.iter() {
            if link.target == type_id {
                links_by_kind
                    .entry(link.kind.clone())
                    .or_insert_with(Vec::<(TypeId, String)>::new)
                    .push((
                        type_id,
                        human_readable_name(
                            data.types_json
                                .get(link.source)
                                .ok_or_else(|| format!("Type with id {} not found", link.source))?,
                        ),
                    ));
            }
        }
    } else {
        return Err("No type graph available".to_string());
    }

    let mut sorted_links: Vec<(LinkKind, Vec<(TypeId, String)>)> =
        links_by_kind.into_iter().collect();
    sorted_links.sort_by(|(_, a), (_, b)| b.len().cmp(&a.len()));
    Ok(sorted_links)
}

#[tauri::command]
pub async fn get_resolved_type_by_id(
    state: State<'_, Arc<Mutex<AppData>>>,
    type_id: Option<usize>,
) -> Result<Option<ResolvedType>, String> {
    if let Some(id) = type_id {
        let data = state.lock().map_err(|e| e.to_string())?;
        if let Some(t) = data.types_json.get(id) {
            Ok(Some(t.clone()))
        } else {
            Err(format!("Type with id {} not found", id))
        }
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn get_resolved_types_by_ids(
    state: State<'_, Arc<Mutex<AppData>>>,
    type_ids: Option<Vec<usize>>,
) -> Result<HashMap<usize, Option<ResolvedType>>, String> {
    let mut result = HashMap::new();
    let data = state.lock().map_err(|e| e.to_string())?;
    if let Some(ids) = type_ids {
        for id in ids {
            let entry = data.types_json.get(id).cloned();
            result.insert(id, entry);
        }
    }
    Ok(result)
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppStats {
    pub types_count: usize,
    pub links_count: usize,
}

#[tauri::command]
pub async fn get_app_stats(state: State<'_, Arc<Mutex<AppData>>>) -> Result<AppStats, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(AppStats {
        // we synthetically insert id:0 to make it so you can just index the vec to lookup by id
        types_count: data.types_json.len() - 1,
        links_count: data
            .type_graph
            .as_ref()
            .map_or(0, |graph| graph.links.len()),
    })
}

#[tauri::command]
pub async fn get_recursive_resolved_types(
    state: State<'_, Arc<Mutex<AppData>>>,
    type_id: Option<usize>,
) -> Result<HashMap<TypeId, ResolvedType>, String> {
    if type_id.is_none() {
        return Ok(HashMap::new());
    }

    let data = state.lock().map_err(|e| e.to_string())?;

    let mut result = HashMap::new();

    fn collect_types(
        current_id: TypeId,
        accumulator: &mut HashMap<TypeId, ResolvedType>,
        types: &[ResolvedType],
    ) {
        if accumulator.contains_key(&current_id) {
            return;
        }
        if let Some(resolved_type) = types.get(current_id) {
            accumulator.insert(current_id, resolved_type.clone());
            for link in get_relationships_for_type(resolved_type) {
                collect_types(link.target, accumulator, types);
            }
        }
    }

    let types: &[ResolvedType] = &data.types_json;
    collect_types(type_id.unwrap(), &mut result, types);
    Ok(result)
}
