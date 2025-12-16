use crate::{
    analyze_trace::{
        AnalyzeTraceOptions, AnalyzeTraceResult, analyze_trace, constants::ANALYZE_TRACE_FILENAME,
    },
    app_data::AppData,
    type_graph::{TYPE_GRAPH_FILENAME, TypeGraph},
    utils::make_cli_arg,
    validate::{
        trace_json::{TRACE_JSON_FILENAME, TraceEvent, read_trace_json},
        types_json::{TYPES_JSON_FILENAME, TypesJsonSchema, load_types_json},
        utils::CPU_PROFILE_FILENAME,
    },
};
use std::{
    path::Path,
    sync::{Arc, Mutex},
};
use tauri::{AppHandle, State};
use tracing::{debug, error, info};

// Async helper to validate outputs in outputs_dir and return parsed results
pub async fn validate_types_and_trace_async(
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

            let (types, trace) = validate_types_and_trace_async(&outputs_dir).await?;
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

/// Build the in-memory graph from the loaded `types_json` and store in AppData via `State`.
#[tauri::command]
pub fn generate_type_graph(
    _app: AppHandle,
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<(), String> {
    let types: TypesJsonSchema = {
        let app_data = state
            .lock()
            .map_err(|_| "AppData mutex poisoned".to_string())?;

        // Check if both types.json and trace.json exist
        if app_data.types_json.is_empty() {
            return Err("Cannot build type graph: types.json is required".to_string());
        }

        if app_data.trace_json.is_empty() {
            return Err("Cannot build type graph: trace.json is required".to_string());
        }

        app_data.types_json.clone()
    };

    // Build the graph
    let graph = TypeGraph::from_types(&types);

    // Attach to LayerCake or settings? Keep simple: stash in `cake` extras via BTreeMap
    // For now, we add it to an ad-hoc static holder in AppData via lazy BTreeMap-like cache.
    // Since AppData does not yet include a graph field, we use a simple file cache as fallback.
    // To keep everything in-memory, we store it on the `auth_code` field comment-free by extending AppData later if needed.
    // Minimal approach: serialize into a ForceGraphData and keep as text output for retrieval.

    // Store in AppData for quick in-memory access
    {
        let mut app_data = state
            .lock()
            .map_err(|_| "AppData mutex poisoned".to_string())?;
        app_data.type_graph = Some(graph);

        // Persist to outputs/type-graph.json for refresh-on-boot
        let outputs_dir = app_data.outputs_dir();
        let path = outputs_dir.join(TYPE_GRAPH_FILENAME);
        let json = serde_json::to_string_pretty(&app_data.type_graph)
            .map_err(|e| format!("Failed to serialize type_graph: {e}"))?;
        std::fs::create_dir_all(&outputs_dir)
            .map_err(|e| format!("Failed to create outputs dir: {e}"))?;
        std::fs::write(&path, json)
            .map_err(|e| format!("Failed to write {}: {e}", path.display()))?;
    }

    Ok(())
}
