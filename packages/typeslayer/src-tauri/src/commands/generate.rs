use crate::{
    analytics::{
        TypeSlayerEvent,
        event_analyze_trace_fail::{EventAnalyzeTraceFail, EventAnalyzeTraceFailArgs},
        event_analyze_trace_success::{EventAnalyzeTraceSuccess, EventAnalyzeTraceSuccessArgs},
        event_generate_trace_fail::{EventGenerateTraceFail, EventGenerateTraceFailArgs},
        event_generate_trace_success::{EventGenerateTraceSuccess, EventGenerateTraceSuccessArgs},
        event_type_graph_success::{EventTypeGraphSuccess, EventTypeGraphSuccessArgs},
    },
    analyze_trace::{
        AnalyzeTraceOptions, AnalyzeTraceResult, analyze_trace, constants::ANALYZE_TRACE_FILENAME,
    },
    app_data::AppData,
    commands::tasks::{TaskId, start_task},
    process_controller::{ProcessController, process_output},
    type_graph::{TYPE_GRAPH_FILENAME, TypeGraph},
    utils::make_cli_arg,
    validate::{
        trace_json::{TRACE_JSON_FILENAME, TraceEvent, load_trace_json},
        types_json::{TYPES_JSON_FILENAME, TypesJsonSchema, load_types_json},
        utils::CPU_PROFILE_FILENAME,
    },
};
use std::path::Path;
use std::time::Instant;
use tauri::{AppHandle, State};
use tokio::{fs, sync::Mutex};
use tracing::{debug, error, info};

// Async helper to validate outputs in outputs_dir and return parsed results
pub async fn validate_types_and_trace_async(
    outputs_dir: &str,
) -> Result<((TypesJsonSchema, usize), (Vec<TraceEvent>, usize)), String> {
    let types_path = Path::new(outputs_dir).join(TYPES_JSON_FILENAME.trim_start_matches('/'));
    let types_json_size = std::fs::metadata(&types_path)
        .map(|meta| meta.len() as usize)
        .unwrap();

    let trace_path = Path::new(outputs_dir).join(TRACE_JSON_FILENAME.trim_start_matches('/'));
    let trace_json_size = std::fs::metadata(&trace_path)
        .map(|meta| meta.len() as usize)
        .unwrap();

    // Read/parse concurrently
    let (types_res, trace_res) = tokio::join!(
        load_types_json(types_path.clone()),
        load_trace_json(trace_path.clone())
    );

    let types = types_res.map_err(|e| {
        format!(
            "[init_types_json] types.json validation failed: {e}\nExpected file at: {types_path:?}",
        )
    })?;
    let trace = trace_res.map_err(|e| {
        format!(
            "[init_trace_json] trace.json validation failed: {e}\nExpected file at: {trace_path:?}",
        )
    })?;
    debug!(
        "[validate_types_and_trace_async] Loaded types.json ({} types) and trace.json ({} events)",
        types.len(),
        trace.len()
    );
    Ok(((types, types_json_size), (trace, trace_json_size)))
}

#[tauri::command]
pub async fn generate_trace(
    app: AppHandle,
    app_data: State<'_, &Mutex<AppData>>,
    process_controller: State<'_, ProcessController>,
) -> Result<(), String> {
    let _guard = start_task(app, TaskId::GenerateTrace)?;

    let mut data = app_data.lock().await;
    let outputs_dir = data.outputs_dir().to_string_lossy().to_string();
    let start_time = Instant::now();

    info!("[generate_trace] will write outputs under {}", outputs_dir);
    let outputs_dir_for_closure = outputs_dir.clone();
    let flag = make_cli_arg("--generateTrace", &outputs_dir_for_closure);

    let command_output = data.call_typescript(&process_controller, flag).await?;

    if !command_output.status.success() {
        let duration = start_time.elapsed().as_millis() as u64;
        let (stdout, stderr) = process_output(command_output).await?;

        EventGenerateTraceFail::send(
            &data,
            EventGenerateTraceFailArgs {
                duration,
                stdout: Some(stdout.clone()),
                stderr: Some(stderr.clone()),
            },
        )
        .await;
        return Err(format!(
            "generate trace failed:\nSTDOUT:\n{stdout}\nSTDERR:\n{stderr}"
        ));
    }

    info!("[generate_trace] Listing files in output directory: {outputs_dir}");
    if let Ok(entries) = std::fs::read_dir(&outputs_dir) {
        for entry in entries.flatten() {
            if let Ok(file_name) = entry.file_name().into_string() {
                info!("  Found file: {}", file_name);
            }
        }
    } else {
        info!("[generate_trace] Could not read outputs directory: {outputs_dir}");
    }

    let ((types, types_json_file_size), (trace, trace_json_file_size)) =
        validate_types_and_trace_async(&outputs_dir).await?;
    data.types_json = types;
    data.trace_json = trace;
    let duration = start_time.elapsed().as_millis() as u64;
    data.update_typeslayer_config_toml().await;
    debug!(
        "[generate_trace] cached {} types and {} trace events",
        data.types_json.len(),
        data.trace_json.len()
    );

    let (stdout, stderr) = process_output(command_output).await?;
    EventGenerateTraceSuccess::send(
        &data,
        EventGenerateTraceSuccessArgs {
            duration,
            stdout: Some(stdout),
            stderr: Some(stderr),
            trace_json_file_size,
            types_json_file_size,
        },
    )
    .await;

    Ok(())
}

#[tauri::command]
pub async fn generate_cpu_profile(
    app: AppHandle,
    state: State<'_, &Mutex<AppData>>,
    process_controller: State<'_, ProcessController>,
) -> Result<(), String> {
    let _guard = start_task(app, TaskId::GenerateCpuProfile)?;

    let mut data = state.lock().await;
    let outputs_dir = data.outputs_dir().to_string_lossy().to_string();

    info!(
        "[generate_cpu_profile]: will write profile under {}",
        outputs_dir
    );
    let outputs_dir_for_closure = outputs_dir.clone();
    let generation_path = Path::new(&outputs_dir_for_closure).join(CPU_PROFILE_FILENAME);
    let flag = make_cli_arg("--generateCpuProfile", &generation_path.to_string_lossy());

    let command_output = data.call_typescript(&process_controller, flag).await?;

    if !command_output.status.success() {
        let (stdout, stderr) = process_output(command_output).await?;
        return Err(format!(
            "generate CPU profile failed:\nSTDOUT:\n{stdout}\nSTDERR:\n{stderr}"
        ));
    }

    // On success, read and cache CPU profile contents
    let path = Path::new(&outputs_dir).join(CPU_PROFILE_FILENAME);
    match tokio::fs::read_to_string(&path).await {
        Ok(contents) => {
            data.cpu_profile = Some(contents);
            debug!(
                "[generate_cpu_profile] cached CPU profile of size {} bytes",
                data.cpu_profile.as_ref().map_or(0, |s| s.len())
            );
            data.update_typeslayer_config_toml().await;
        }
        Err(e) => error!("Failed to read CPU profile after generation: {}", e),
    };

    Ok(())
}

#[tauri::command]
pub async fn generate_analyze_trace(
    app: AppHandle,
    state: State<'_, &Mutex<AppData>>,
    options: Option<AnalyzeTraceOptions>,
) -> Result<(), String> {
    let _guard = start_task(app, TaskId::GenerateAnalyzeTrace)?;

    let mut app_data = state.lock().await;
    let start_time = Instant::now();

    let outputs_dir = app_data.outputs_dir().to_string_lossy().to_string();
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

    let duration = start_time.elapsed().as_millis() as u64;

    match handle.await {
        Ok(Ok(analyze_trace_result)) => {
            EventAnalyzeTraceSuccess::send(&app_data, EventAnalyzeTraceSuccessArgs { duration })
                .await;
            app_data.analyze_trace = Some(analyze_trace_result);
            app_data.update_typeslayer_config_toml().await;
            debug!(
                "[generate_analyze_trace] wrote {} in {}",
                ANALYZE_TRACE_FILENAME, trace_dir_for_log
            );

            debug!("[generate_analyze_trace] completed");
            Ok(())
        }
        Ok(Err(e)) => {
            EventAnalyzeTraceFail::send(
                &app_data,
                EventAnalyzeTraceFailArgs {
                    duration,
                    reason: e.clone(),
                },
            )
            .await;
            Err(format!("[generate_analyze_trace] analyze_trace error: {e}"))
        }
        Err(e) => {
            EventAnalyzeTraceFail::send(
                &app_data,
                EventAnalyzeTraceFailArgs {
                    duration,
                    reason: format!("Join error: {}", e),
                },
            )
            .await;
            Err(format!("[generate_analyze_trace] join error: {e}"))
        }
    }
}

/// Build the in-memory graph from the loaded `types_json` and store in AppData via `State`.
#[tauri::command]
pub async fn generate_type_graph(
    app: AppHandle,
    state: State<'_, &Mutex<AppData>>,
) -> Result<(), String> {
    let _guard = start_task(app, TaskId::GenerateTypeGraph)?;

    let mut app_data = state.lock().await;
    let start_time = Instant::now();

    let types: &TypesJsonSchema = {
        // Check if both types.json and trace.json exist
        if app_data.types_json.is_empty() {
            return Err("Cannot build type graph: types.json is required".to_string());
        }

        if app_data.trace_json.is_empty() {
            return Err("Cannot build type graph: trace.json is required".to_string());
        }

        &app_data.types_json
    };

    let graph = TypeGraph::from_types(types);
    let duration = start_time.elapsed().as_millis() as u64;

    app_data.type_graph = Some(graph);

    EventTypeGraphSuccess::send(&app_data, EventTypeGraphSuccessArgs { duration }).await;

    let outputs_dir = app_data.outputs_dir();
    let path = outputs_dir.join(TYPE_GRAPH_FILENAME);
    let json = serde_json::to_string_pretty(&app_data.type_graph)
        .map_err(|e| format!("Failed to serialize type_graph: {e}"))?;
    fs::create_dir_all(&outputs_dir)
        .await
        .map_err(|e| format!("Failed to create outputs dir: {e}"))?;
    fs::write(&path, json)
        .await
        .map_err(|e| format!("Failed to write {}: {e}", path.display()))?;

    Ok(())
}

#[tauri::command]
pub async fn generate_all(
    app: AppHandle,
    state: State<'_, &Mutex<AppData>>,
    process_controller: State<'_, ProcessController>,
) -> Result<(), String> {
    generate_trace(app.clone(), state.clone(), process_controller.clone()).await?;
    generate_cpu_profile(app.clone(), state.clone(), process_controller.clone()).await?;
    generate_analyze_trace(app.clone(), state.clone(), None).await?;
    generate_type_graph(app, state).await?;
    Ok(())
}

#[tauri::command]
pub async fn cancel_generation(
    process_controller: State<'_, ProcessController>,
) -> Result<(), String> {
    process_controller.request_cancel()
}
