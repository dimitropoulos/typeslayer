use crate::{
    analyze_trace::{AnalyzeTraceResult, constants::ANALYZE_TRACE_FILENAME},
    app_data::AppData,
    process_controller::ProcessController,
    type_graph::{CompactGraphLink, CompactGraphLinkStats, GraphNodeStats, GraphStats},
    utils::{compute_window_title, set_window_title},
    validate::trace_json::TraceEvent,
};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, State};
use tokio::sync::Mutex;
use tracing::debug;

#[tauri::command]
pub async fn get_project_root(state: State<'_, &Mutex<AppData>>) -> Result<String, String> {
    Ok(state
        .lock()
        .await
        .project_root
        .to_string_lossy()
        .to_string())
}

#[tauri::command]
pub async fn set_project_root(
    app: AppHandle,
    state: State<'_, &Mutex<AppData>>,
    project_root: String,
) -> Result<(), String> {
    let mut data = state.lock().await;
    let path_buf = PathBuf::from(project_root.clone());
    let window_title = compute_window_title(path_buf.clone()).await;
    set_window_title(&app, window_title).await?;
    data.set_project_root(path_buf).await?;
    Ok(())
}

#[tauri::command]
pub async fn get_trace_json(state: State<'_, &Mutex<AppData>>) -> Result<Vec<TraceEvent>, String> {
    let data = state.lock().await;
    debug!(
        "[get_trace_json] returning {} trace events",
        data.trace_json.len()
    );
    Ok(data.trace_json.clone())
}

#[tauri::command]
pub async fn get_analyze_trace(
    state: State<'_, &Mutex<AppData>>,
) -> Result<AnalyzeTraceResult, String> {
    let mut data = state.lock().await;
    // Serve cached value if present
    if let Some(result) = &data.analyze_trace {
        return Ok(result.clone());
    }

    // Read from disk and cache
    let path = {
        let outputs_dir = data.outputs_dir().to_string_lossy().to_string();
        Path::new(&outputs_dir).join(ANALYZE_TRACE_FILENAME)
    };
    let contents = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
    let parsed: AnalyzeTraceResult = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))?;
    data.analyze_trace = Some(parsed.clone());
    debug!(
        "[get_analyze_trace] loaded analyze trace from disk with size {} bytes",
        contents.len()
    );
    Ok(parsed)
}

#[tauri::command]
pub async fn get_cpu_profile(state: State<'_, &Mutex<AppData>>) -> Result<Option<String>, String> {
    let data = state.lock().await;
    debug!(
        "[get_cpu_profile] returning CPU profile of size {} bytes",
        data.cpu_profile.as_ref().map_or(0, |s| s.len())
    );
    Ok(data.cpu_profile.clone())
}

#[tauri::command]
pub async fn get_tsconfig_paths(state: State<'_, &Mutex<AppData>>) -> Result<Vec<String>, String> {
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
    state: State<'_, &Mutex<AppData>>,
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
    state: State<'_, &Mutex<AppData>>,
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
pub async fn get_data_dir(state: State<'_, &Mutex<AppData>>) -> Result<String, String> {
    let data = state.lock().await;
    Ok(data.data_dir.to_string_lossy().to_string())
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodesAndLinks {
    pub nodes: usize,
    pub links: Vec<CompactGraphLink>,
}

#[tauri::command]
pub async fn get_type_graph_nodes_and_links(
    state: State<'_, &Mutex<AppData>>,
) -> Result<NodesAndLinks, String> {
    let data = state.lock().await;

    let tg = data
        .type_graph
        .as_ref()
        .ok_or_else(|| "type graph unavailable".to_string())?;
    Ok(NodesAndLinks {
        nodes: tg.nodes,
        links: tg.links.iter().map(|l| l.clone().into()).collect(),
    })
}

#[tauri::command]
pub async fn get_type_graph_stats(state: State<'_, &Mutex<AppData>>) -> Result<GraphStats, String> {
    let data = state.lock().await;

    let tg = data
        .type_graph
        .as_ref()
        .ok_or_else(|| "type graph unavailable".to_string())?;
    Ok(tg.stats.clone())
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeAndLinkStats {
    pub node_stats: GraphNodeStats,
    pub link_stats: CompactGraphLinkStats,
}

#[tauri::command]
pub async fn get_type_graph_node_and_link_stats(
    state: State<'_, &Mutex<AppData>>,
) -> Result<NodeAndLinkStats, String> {
    let data = state.lock().await;

    let tg = data
        .type_graph
        .as_ref()
        .ok_or_else(|| "type graph unavailable".to_string())?;

    let compact_link_stats = tg
        .link_stats
        .iter()
        .map(|(kind, stats)| (kind.clone(), stats.clone().into()))
        .collect();

    Ok(NodeAndLinkStats {
        node_stats: tg.node_stats.clone(),
        link_stats: compact_link_stats,
    })
}

#[tauri::command]
pub async fn clear_outputs(
    process_controller: State<'_, ProcessController>,
    state: State<'_, &Mutex<AppData>>,
    cancel_running: bool,
) -> Result<(), String> {
    if cancel_running {
        process_controller.request_cancel()?;
    }
    state.lock().await.clear_outputs_dir().await?;

    Ok(())
}
