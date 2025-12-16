use crate::{
    analyze_trace::{AnalyzeTraceResult, constants::ANALYZE_TRACE_FILENAME},
    app_data::AppData,
    commands::generate::generate_type_graph,
    type_graph::TypeGraph,
    validate::{trace_json::TraceEvent, types_json::TypesJsonSchema},
};
use std::{
    path::{Path, PathBuf},
    sync::Arc,
};
use tauri::{AppHandle, State};
use tokio::sync::Mutex;
use tracing::debug;

#[tauri::command]
pub async fn get_project_root(state: State<'_, Arc<Mutex<AppData>>>) -> Result<String, String> {
    Ok(state
        .lock()
        .await
        .project_root
        .to_string_lossy()
        .to_string())
}

#[tauri::command]
pub async fn set_project_root(
    state: State<'_, Arc<Mutex<AppData>>>,
    project_root: String,
) -> Result<(), String> {
    let mut data = state.lock().await;
    let path_buf = PathBuf::from(project_root.clone());
    data.set_project_root(path_buf).await?;
    Ok(())
}

#[tauri::command]
pub async fn get_types_json(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<TypesJsonSchema, String> {
    let data = state.lock().await;
    debug!("[get_types_json] returning {} types", data.types_json.len());
    Ok(data.types_json.clone())
}

#[tauri::command]
pub async fn get_trace_json(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<Vec<TraceEvent>, String> {
    let data = state.lock().await;
    debug!(
        "[get_trace_json] returning {} trace events",
        data.trace_json.len()
    );
    Ok(data.trace_json.clone())
}

#[tauri::command]
pub async fn get_analyze_trace(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<AnalyzeTraceResult, String> {
    // Serve cached value if present
    {
        let data = state.lock().await;
        if let Some(result) = &data.analyze_trace {
            return Ok(result.clone());
        }
    }

    // Read from disk and cache
    let path = {
        let data = state.lock().await;
        let outputs_dir = data.outputs_dir().to_string_lossy().to_string();
        Path::new(&outputs_dir).join(ANALYZE_TRACE_FILENAME)
    };
    let contents = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
    let parsed: AnalyzeTraceResult = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))?;
    let mut data = state.lock().await;
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
    let data = state.lock().await;
    debug!(
        "[get_cpu_profile] returning CPU profile of size {} bytes",
        data.cpu_profile.as_ref().map_or(0, |s| s.len())
    );
    Ok(data.cpu_profile.clone())
}

#[tauri::command]
pub async fn get_tsconfig_paths(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<Vec<String>, String> {
    let data = state.lock().await;
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
    let data = state.lock().await;
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
    let mut data = state.lock().await;

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
pub async fn get_data_dir(state: State<'_, Arc<Mutex<AppData>>>) -> Result<String, String> {
    let data = state.lock().await;
    Ok(data.data_dir.to_string_lossy().to_string())
}

/// Return the graph data formatted for react-force-graph. Builds if missing.
#[tauri::command]
pub async fn get_type_graph(
    app: AppHandle,
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<TypeGraph, String> {
    // If not yet built, build once
    let needs_build = {
        let app_data = state.lock().await;
        app_data.type_graph.is_none()
    };
    if needs_build {
        generate_type_graph(app.clone(), state.clone()).await?;
    }

    let app_data = state.lock().await;
    let fg = app_data
        .type_graph
        .as_ref()
        .ok_or_else(|| "type graph unavailable".to_string())?;
    Ok(fg.clone())
}

#[tauri::command]
pub async fn clear_outputs(
    state: State<'_, Arc<Mutex<AppData>>>,
    cancel_running: bool,
) -> Result<(), String> {
    let controller = {
        let data = state.lock().await;
        data.process_controller.clone()
    };

    if cancel_running {
        controller.request_cancel().await?;
    }

    let mut data = state.lock().await;
    data.clear_outputs_dir().await
}
