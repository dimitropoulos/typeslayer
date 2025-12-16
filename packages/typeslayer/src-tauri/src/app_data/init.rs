use crate::{
    analyze_trace::{AnalyzeTraceResult, constants::ANALYZE_TRACE_FILENAME},
    app_data::Settings,
    layercake::{LayerCake, ResolveBoolArgs, ResolveStringArgs},
    type_graph::{TYPE_GRAPH_FILENAME, TypeGraph},
    utils::{
        AVAILABLE_EDITORS, PACKAGE_JSON_FILENAME, TSCONFIG_FILENAME, default_extra_tsc_flags,
        detect_project_root_from_cwd, validate_project_root_path,
    },
    validate::{
        trace_json::{TRACE_JSON_FILENAME, TraceEvent, parse_trace_json},
        types_json::{TYPES_JSON_FILENAME, TypesJsonSchema, parse_types_json},
        utils::CPU_PROFILE_FILENAME,
    },
};
use std::path::{Path, PathBuf};
use tracing::{debug, info};

pub fn init_project_root(cake: &LayerCake) -> PathBuf {
    // If neither env nor CLI flag have been provided, favor the current working directory
    // when it already contains a package.json. This prevents stale typeslayer.toml entries
    // from overriding local runs.
    let no_env_or_flag = !cake.has_env("PROJECT_ROOT") && !cake.has_flag("--project-root");
    if no_env_or_flag {
        if let Some(cwd_pkg) = detect_project_root_from_cwd() {
            if let Ok(validated) = validate_project_root_path(&cwd_pkg.to_string_lossy()) {
                info!(
                    "[init_project_root] using project_root from current directory: {}",
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
        validate: |s| validate_project_root_path(s).map(|p| p.to_string_lossy().to_string()),
    });
    let path = PathBuf::from(resolved);
    info!(
        "[init_project_root] resolved project_root from config/env/flag: {}",
        path.display()
    );
    path
}

pub fn init_types_json(outputs_dir: &Path, project_root: &Path) -> TypesJsonSchema {
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

pub fn init_trace_json(outputs_dir: &Path, project_root: &Path) -> Vec<TraceEvent> {
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

pub fn init_analyze_trace(outputs_dir: &Path) -> Option<AnalyzeTraceResult> {
    let analyze_path = outputs_dir.join(ANALYZE_TRACE_FILENAME);
    if analyze_path.exists() {
        match std::fs::read_to_string(&analyze_path)
            .map_err(|e| e.to_string())
            .and_then(|s| serde_json::from_str::<AnalyzeTraceResult>(&s).map_err(|e| e.to_string()))
        {
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

pub fn init_type_graph(outputs_dir: &Path) -> Option<TypeGraph> {
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

pub fn init_cpu_profile(outputs_dir: &Path) -> Option<String> {
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

pub fn init_verbose(cake: &LayerCake) -> bool {
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
