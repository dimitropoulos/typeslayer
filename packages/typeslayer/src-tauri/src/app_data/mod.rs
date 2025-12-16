pub mod command;
pub mod init;
pub mod settings;

use crate::{
    analyze_trace::{AnalyzeTraceResult, constants::ANALYZE_TRACE_FILENAME},
    app_data::{
        command::{PackageJSON, PackageManager, TSCCommand},
        init::{
            init_analyze_trace, init_auth_code, init_cpu_profile, init_project_root,
            init_selected_tsconfig_with, init_settings, init_trace_json, init_type_graph,
            init_types_json, init_verbose,
        },
        settings::Settings,
    },
    layercake::{LayerCake, LayerCakeInitArgs, Source},
    process_controller::ProcessController,
    type_graph::{TYPE_GRAPH_FILENAME, TypeGraph},
    utils::{
        CONFIG_FILENAME, OUTPUTS_DIRECTORY, TSCONFIG_FILENAME, file_mtime_iso, quote_if_needed,
    },
    validate::{
        trace_json::{TRACE_JSON_FILENAME, TraceEvent},
        types_json::{TYPES_JSON_FILENAME, TypesJsonSchema},
        utils::CPU_PROFILE_FILENAME,
    },
};
use std::fs;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use std::path::Path;
use std::process::{Command, Stdio};
use std::{cmp::Ordering, path::PathBuf};
use std::{fs::File, io::BufReader};
use tracing::{debug, error, info};

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

        let project_root = init_project_root(&cake);
        let outputs_dir = data_dir.join(OUTPUTS_DIRECTORY);
        let types_json = init_types_json(&outputs_dir, &project_root);
        let trace_json = init_trace_json(&outputs_dir, &project_root);
        let analyze_trace = init_analyze_trace(&outputs_dir);
        let type_graph = init_type_graph(&outputs_dir);
        let cpu_profile = init_cpu_profile(&outputs_dir);
        let settings = init_settings(&cake);
        let verbose = init_verbose(&cake);
        let auth_code = init_auth_code(&cake);

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
        app.selected_tsconfig = init_selected_tsconfig_with(&app.cake, &app.tsconfig_paths);
        Ok(app)
    }

    pub fn outputs_dir(&self) -> PathBuf {
        self.data_dir.join(OUTPUTS_DIRECTORY)
    }

    pub fn set_project_root(&mut self, new_root: PathBuf) -> Result<(), String> {
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
        self.selected_tsconfig = init_selected_tsconfig_with(&self.cake, &self.tsconfig_paths);

        Ok(())
    }

    pub fn discover_tsconfigs(&mut self) -> Result<(), String> {
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

    pub fn get_tsc_call(&self, user_flags: &str) -> Result<TSCCommand, String> {
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
    pub fn run_tsc(&self, flag: String, context: &str) -> Result<(), String> {
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
            types_json: file_mtime_iso(&types_path),
            trace_json: file_mtime_iso(&trace_path),
            analyze_trace: file_mtime_iso(&analyze_path),
            type_graph: file_mtime_iso(&type_graph_path),
            cpu_profile: file_mtime_iso(&cpu_path),
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

    pub fn find_package_manager(project_root: &Path) -> Result<PackageManager, String> {
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
