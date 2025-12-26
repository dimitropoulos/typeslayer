use crate::{
    analyze_trace::{AnalyzeTraceResult, constants::ANALYZE_TRACE_FILENAME},
    app_data::{Settings, settings::TypeScriptCompilerVariant},
    layercake::{
        LayerCake, ResolveArrayOfStringsArgs, ResolveBoolArgs, ResolveNumberArgs, ResolveStringArgs,
    },
    type_graph::{TYPE_GRAPH_FILENAME, TypeGraph},
    utils::{
        AVAILABLE_EDITORS, TSCONFIG_FILENAME, default_extra_tsc_flags,
        detect_project_root_from_cwd, validate_project_root_path,
    },
    validate::{
        trace_json::{TRACE_JSON_FILENAME, TraceEvent, load_trace_json},
        types_json::{TYPES_JSON_FILENAME, TypesJsonSchema, load_types_json},
        utils::CPU_PROFILE_FILENAME,
    },
};
use nanoid::nanoid;
use std::{
    io::BufReader,
    path::{Path, PathBuf},
};
use tracing::{debug, info};

pub fn init_project_root(cake: &LayerCake) -> PathBuf {
    // If neither env nor CLI flag have been provided, favor the current working directory
    // when it already contains a package.json. This prevents stale typeslayer.toml entries
    // from overriding local runs.
    let no_env_or_flag = !cake.has_env("PROJECT_ROOT") && !cake.has_flag("--project-root");
    if no_env_or_flag && let Some(cwd_dir) = detect_project_root_from_cwd() {
        info!(
            "[init_project_root] using project_root from current directory: {}",
            cwd_dir.display()
        );
        return cwd_dir;
    }

    let resolved = cake.resolve_string(ResolveStringArgs {
        env: "PROJECT_ROOT",
        flag: "--project-root",
        file: "project_root",
        default: || {
            std::env::current_dir()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|_| ".".to_string())
        },
        validate: |s| validate_project_root_path(s).map(|p| p.to_string_lossy().to_string()),
    });
    let path = PathBuf::from(resolved);
    info!(
        "[init_project_root] resolved project_root from config/env/flag: {}",
        path.display()
    );
    path
}

pub async fn init_types_json(outputs_dir: &Path, project_root: &Path) -> TypesJsonSchema {
    let type_paths = [
        outputs_dir.join(TYPES_JSON_FILENAME.trim_start_matches('/')),
        project_root.join(TYPES_JSON_FILENAME.trim_start_matches('/')),
    ];
    for p in type_paths {
        if p.exists() {
            match load_types_json(p.clone()).await {
                Ok(parsed) => {
                    debug!("[init_types_json] Loaded types.json from {:?}", p);
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

pub async fn init_trace_json(outputs_dir: &Path, project_root: &Path) -> Vec<TraceEvent> {
    let trace_paths = [
        outputs_dir.join(TRACE_JSON_FILENAME.trim_start_matches('/')),
        project_root.join(TRACE_JSON_FILENAME.trim_start_matches('/')),
    ];
    for p in trace_paths {
        if p.exists() {
            match load_trace_json(p.clone()).await {
                Ok(parsed) => {
                    debug!("[init_trace_json] Loaded trace.json from {:?}", p);
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

pub async fn init_analyze_trace(outputs_dir: &Path) -> Option<AnalyzeTraceResult> {
    let analyze_path = outputs_dir.join(ANALYZE_TRACE_FILENAME);
    read_file("init_analyze_trace", analyze_path).await
}

pub async fn init_type_graph(outputs_dir: &Path) -> Option<TypeGraph> {
    let path = outputs_dir.join(TYPE_GRAPH_FILENAME.trim_start_matches('/'));
    read_file("init_type_graph", path).await
}

pub async fn init_cpu_profile(outputs_dir: &Path) -> Option<String> {
    let cpu_profile_path = outputs_dir.join(CPU_PROFILE_FILENAME);
    read_file("init_cpu_profile", cpu_profile_path).await
}

async fn read_file<T: Send + serde::de::DeserializeOwned + 'static>(
    name: &'static str,
    path: PathBuf,
) -> Option<T> {
    let result = tauri::async_runtime::spawn_blocking(move || {
        let result = {
            match std::fs::File::open(&path) {
                Ok(file) => {
                    serde_json::from_reader(BufReader::new(file)).map_err(|e| e.to_string())
                }
                Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
                    debug!("[{name}] No valid analyze-trace.json found at startup");
                    return None;
                }
                Err(err) => Err(err.to_string()),
            }
        };

        match result {
            Ok(result) => Some(result),
            Err(e) => {
                info!(
                    "[{name}] Startup ingestion failed at {}: {}",
                    path.display(),
                    e
                );
                None
            }
        }
    })
    .await;

    match result {
        Ok(result) => result,
        Err(err) => {
            info!("[init_analyze_trace] Failed to run task: {err}");
            None
        }
    }
}

pub fn init_settings(cake: &LayerCake) -> Settings {
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
                Err(format!("Editor {s:?} not in available editors list"))
            }
        },
    }));
    let extra_tsc_flags = cake.resolve_string(ResolveStringArgs {
        env: "EXTRA_TSC_FLAGS",
        flag: "--extra-tsc-flags",
        file: "settings.extraTscFlags",
        default: default_extra_tsc_flags,
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
                        .map_err(|e| format!("Invalid maxOldSpaceSize value {s:?}: {e}"))
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
                        .map_err(|e| format!("Invalid maxStackSize value {s:?}: {e}"))
                }
            },
        });
        if val.is_empty() {
            None
        } else {
            Some(val.parse::<i32>().unwrap())
        }
    };
    let typescript_compiler_variant = {
        let variant_str = cake.resolve_string(ResolveStringArgs {
            env: "TYPESCRIPT_COMPILER_VARIANT",
            flag: "--typescript-compiler-variant",
            file: "settings.typescriptCompilerVariant",
            default: || TypeScriptCompilerVariant::default().as_str().to_string(),
            validate: |s| {
                s.parse::<TypeScriptCompilerVariant>()
                    .map(|_| s.to_string())
                    .map_err(|_| format!("Invalid TypeScript compiler variant '{}'", s))
            },
        });
        variant_str
            .parse::<TypeScriptCompilerVariant>()
            .unwrap_or_else(|_| TypeScriptCompilerVariant::default())
    };
    let max_nodes = cake.resolve_number(ResolveNumberArgs {
        env: "MAX_NODES",
        flag: "--max-nodes",
        file: "settings.maxNodes",
        default: || Settings::default().max_nodes,
        validate: |n| {
            if *n <= 10_000_000 {
                Ok(*n)
            } else {
                Err("maxNodes must not exceed 10,000,000".to_string())
            }
        },
    });

    let disable_analytics = cake.resolve_bool(ResolveBoolArgs {
        env: "DISABLE_ANALYTICS",
        flag: "--disable-analytics",
        file: "settings.disableAnalytics",
        default: || false,
    });

    let analytics_consent = if disable_analytics {
        Vec::new()
    } else {
        cake.resolve_array_of_strings(ResolveArrayOfStringsArgs {
            env: "ANALYTICS_CONSENT",
            flag: "--analytics-consent",
            file: "settings.analyticsConsent",
            default: || Settings::default().analytics_consent,
            validate: |items| Ok(items.to_vec()),
        })
    };

    Settings {
        relative_paths,
        prefer_editor_open,
        preferred_editor,
        extra_tsc_flags,
        apply_tsc_project_flag,
        max_old_space_size,
        max_stack_size,
        typescript_compiler_variant,
        max_nodes,
        analytics_consent,
    }
}

pub fn init_verbose(cake: &LayerCake) -> bool {
    cake.resolve_bool(ResolveBoolArgs {
        env: "VERBOSE",
        flag: "--verbose",
        file: "verbose",
        default: || cfg!(debug_assertions),
    })
}

pub fn init_auth_code(cake: &LayerCake) -> Option<String> {
    let code = cake.resolve_string(ResolveStringArgs {
        env: "AUTH_CODE",
        flag: "--auth-code",
        file: "auth_code",
        default: || "".to_string(),
        validate: |s| Ok(s.to_string()),
    });
    tracing::info!("[init_auth_code] resolved code = '{}'", code);
    if code.is_empty() { None } else { Some(code) }
}
pub fn init_selected_tsconfig_with(
    cake: &LayerCake,
    tsconfig_paths: &[PathBuf],
) -> Option<PathBuf> {
    let auto_detect = || {
        // Prefer tsconfig.json, then first found tsconfig
        for path in tsconfig_paths.iter() {
            if path
                .file_name()
                .is_some_and(|name| name == TSCONFIG_FILENAME)
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
                Err(format!("tsconfig {s:?} not found in discovered paths"))
            }
        },
    });

    if result.is_empty() {
        None
    } else {
        Some(PathBuf::from(result))
    }
}

const ALPHABET: [char; 62] = [
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i',
    'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B',
    'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U',
    'V', 'W', 'X', 'Y', 'Z',
];

pub fn generate_session_id() -> String {
    nanoid!(8, &ALPHABET)
}

pub fn init_session_id(cake: &LayerCake) -> String {
    let id = cake.resolve_string(ResolveStringArgs {
        env: "SESSION_ID",
        flag: "--session-id",
        file: "session_id",
        default: || generate_session_id(),
        validate: |s| Ok(s.to_string()),
    });
    tracing::info!("[init_session_id] resolved session_id = '{}'", id);
    id
}
