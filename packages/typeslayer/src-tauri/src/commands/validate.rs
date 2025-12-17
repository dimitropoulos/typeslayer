use crate::analyze_trace::{AnalyzeTraceResult, constants::ANALYZE_TRACE_FILENAME};
use crate::app_data::AppData;
use crate::type_graph::{TYPE_GRAPH_FILENAME, TypeGraph};
use crate::validate::utils::CPU_PROFILE_FILENAME;
use crate::validate::{
    trace_json::{TRACE_JSON_FILENAME, parse_trace_json},
    types_json::{TYPES_JSON_FILENAME, parse_types_json},
};
use tauri::State;
use tokio::sync::Mutex;
use tracing::debug;

#[tauri::command]
pub async fn validate_analyze_trace(state: State<'_, &Mutex<AppData>>) -> Result<(), String> {
    let path = {
        let data = state.lock().await;
        data.outputs_dir().join(ANALYZE_TRACE_FILENAME)
    };

    let contents = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;

    let parsed: AnalyzeTraceResult = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))?;

    debug!(
        "[validate_analyze_trace] Validated and loaded {} ({} bytes)",
        ANALYZE_TRACE_FILENAME,
        contents.len()
    );

    let mut data = state.lock().await;
    data.analyze_trace = Some(parsed);
    Ok(())
}

#[tauri::command]
pub async fn validate_trace_json(state: State<'_, &Mutex<AppData>>) -> Result<(), String> {
    let path = {
        let data = state.lock().await;
        data.outputs_dir().join(TRACE_JSON_FILENAME)
    };

    let contents = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;

    let path_str = path.to_string_lossy();
    let parsed = parse_trace_json(&path_str, &contents)?;

    debug!(
        "[validate_trace_json] Validated and loaded {} trace events",
        parsed.len()
    );

    let mut data = state.lock().await;
    data.trace_json = parsed;
    Ok(())
}

#[tauri::command]
pub async fn validate_types_json(state: State<'_, &Mutex<AppData>>) -> Result<(), String> {
    let path = {
        let data = state.lock().await;
        data.outputs_dir().join(TYPES_JSON_FILENAME)
    };

    let contents = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;

    let path_str = path.to_string_lossy();
    let parsed = parse_types_json(&path_str, &contents)?;

    debug!(
        "[validate_types_json] Validated and loaded {} types",
        parsed.len()
    );

    let mut data = state.lock().await;
    data.types_json = parsed;
    Ok(())
}

#[tauri::command]
pub async fn validate_cpu_profile(state: State<'_, &Mutex<AppData>>) -> Result<(), String> {
    let path = {
        let data = state.lock().await;
        data.outputs_dir().join(CPU_PROFILE_FILENAME)
    };

    let contents = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;

    // Validate it's valid JSON
    serde_json::from_str::<serde_json::Value>(&contents)
        .map_err(|e| format!("Failed to parse {} as JSON: {}", path.display(), e))?;

    debug!(
        "[validate_cpu_profile] Validated and loaded CPU profile ({} bytes)",
        contents.len()
    );

    let mut data = state.lock().await;
    data.cpu_profile = Some(contents);
    Ok(())
}

#[tauri::command]
pub async fn validate_type_graph(state: State<'_, &Mutex<AppData>>) -> Result<(), String> {
    let path = {
        let data = state.lock().await;
        data.outputs_dir().join(TYPE_GRAPH_FILENAME)
    };

    let contents = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;

    let parsed: TypeGraph = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))?;

    debug!(
        "[validate_type_graph] Validated and loaded type graph ({} nodes)",
        parsed.nodes
    );

    let mut data = state.lock().await;
    data.type_graph = Some(parsed);
    Ok(())
}
