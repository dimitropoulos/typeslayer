use crate::{
    analyze_trace::{AnalyzeTraceResult, constants::ANALYZE_TRACE_FILENAME},
    app_data::AppData,
    process_controller::ProcessController,
    type_graph::{CountAndMax, LinkKind, LinkKindData, NodeStatKind, NodeStatKindData},
    utils::{compute_window_title, set_window_title},
    validate::{trace_json::TraceEvent, utils::TypeId},
};
use indexmap::IndexMap;
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
    let mut app_data = state.lock().await;
    let path_buf = PathBuf::from(project_root.clone());
    let window_title = compute_window_title(path_buf.clone()).await;
    set_window_title(&app, window_title).await?;
    app_data.set_project_root(path_buf).await?;
    Ok(())
}

#[tauri::command]
pub async fn get_trace_json(state: State<'_, &Mutex<AppData>>) -> Result<Vec<TraceEvent>, String> {
    let app_data = state.lock().await;
    debug!(
        "[get_trace_json] returning {} trace events",
        app_data.trace_json.len()
    );
    Ok(app_data.trace_json.clone())
}

#[tauri::command]
pub async fn get_analyze_trace(
    state: State<'_, &Mutex<AppData>>,
) -> Result<AnalyzeTraceResult, String> {
    let mut app_data = state.lock().await;
    // Serve cached value if present
    if let Some(result) = &app_data.analyze_trace {
        return Ok(result.clone());
    }

    // Read from disk and cache
    let path = {
        let outputs_dir = app_data.outputs_dir().to_string_lossy().to_string();
        Path::new(&outputs_dir).join(ANALYZE_TRACE_FILENAME)
    };
    let contents = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
    let parsed: AnalyzeTraceResult = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))?;
    app_data.analyze_trace = Some(parsed.clone());
    debug!(
        "[get_analyze_trace] loaded analyze trace from disk with size {} bytes",
        contents.len()
    );
    Ok(parsed)
}

#[tauri::command]
pub async fn get_cpu_profile(state: State<'_, &Mutex<AppData>>) -> Result<Option<String>, String> {
    let app_data = state.lock().await;
    debug!(
        "[get_cpu_profile] returning CPU profile of size {} bytes",
        app_data.cpu_profile.as_ref().map_or(0, |s| s.len())
    );
    Ok(app_data.cpu_profile.clone())
}

#[tauri::command]
pub async fn get_tsconfig_paths(state: State<'_, &Mutex<AppData>>) -> Result<Vec<String>, String> {
    let app_data = state.lock().await;
    debug!(
        "[get_tsconfig_paths] returning {} tsconfig paths",
        app_data.tsconfig_paths.len()
    );
    Ok(app_data
        .tsconfig_paths
        .iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect())
}

#[tauri::command]
pub async fn get_selected_tsconfig(
    state: State<'_, &Mutex<AppData>>,
) -> Result<Option<String>, String> {
    let app_data = state.lock().await;
    debug!(
        "[get_selected_tsconfig] returning selected tsconfig = {:?}",
        app_data.selected_tsconfig
    );
    Ok(app_data
        .selected_tsconfig
        .as_ref()
        .map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn set_selected_tsconfig(
    state: State<'_, &Mutex<AppData>>,
    tsconfig_path: String,
) -> Result<(), String> {
    let mut app_data = state.lock().await;

    // Empty string means no tsconfig (valid)
    if tsconfig_path.is_empty() {
        app_data.selected_tsconfig = None;
        debug!("[set_selected_tsconfig] selected tsconfig set to None (empty string provided)");
        return Ok(());
    }

    // Validate that the path exists in discovered tsconfigs
    let path_buf = PathBuf::from(&tsconfig_path);
    if !app_data.tsconfig_paths.contains(&path_buf) {
        return Err(format!(
            "tsconfig {tsconfig_path:?} not found in discovered paths"
        ));
    }

    app_data.selected_tsconfig = Some(path_buf);
    debug!(
        "[set_selected_tsconfig] selected tsconfig set to {:?}",
        app_data.selected_tsconfig
    );
    Ok(())
}

#[tauri::command]
pub async fn get_data_dir(state: State<'_, &Mutex<AppData>>) -> Result<String, String> {
    let app_data = state.lock().await;
    Ok(app_data.data_dir.to_string_lossy().to_string())
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodesAndLinks {
    pub node_count: usize,
    pub is_limited: bool,
    pub links_by_type: IndexMap<LinkKind, Vec<(TypeId, TypeId)>>,
}

#[tauri::command]
pub async fn get_type_graph_nodes_and_links(
    state: State<'_, &Mutex<AppData>>,
) -> Result<NodesAndLinks, String> {
    let app_data = state.lock().await;

    let type_graph = app_data
        .type_graph
        .as_ref()
        .ok_or_else(|| "type graph unavailable".to_string())?;

    let max_nodes = app_data.settings.max_nodes as usize;

    // Filter nodes to only include those with ID < max_nodes
    let filtered_nodes = type_graph.node_count.min(max_nodes);

    // Filter links where both source and target are < max_nodes
    let filtered_links: IndexMap<LinkKind, Vec<(TypeId, TypeId)>> = type_graph
        .link_kind_data_by_kind
        .iter()
        .map(|(kind, link_kind_data)| {
            // loop through all the LinkKindData child_link_data entries
            // and filter the links that have typeids (source and/or target) > max_nodes
            // then flatten the results into a single Vec<(TypeId, TypeId)> where the parent is the source
            let filtered_graph_links: Vec<(TypeId, TypeId)> = link_kind_data
                .by_source
                .source_to_targets
                .iter()
                .filter_map(|child_link| {
                    // Check if target_id is within limits
                    if *child_link.0 >= filtered_nodes as TypeId {
                        return None;
                    }
                    // Filter source_ids within limits
                    let valid_source_ids: Vec<TypeId> = child_link
                        .1
                        .iter()
                        .cloned()
                        .filter(|&source_id| source_id < filtered_nodes as TypeId)
                        .collect();
                    if valid_source_ids.is_empty() {
                        return None;
                    }
                    Some(
                        valid_source_ids
                            .into_iter()
                            .map(|source_id| (source_id, *child_link.0))
                            .collect::<Vec<(TypeId, TypeId)>>(),
                    )
                })
                .flatten()
                .collect();
            (kind.clone(), filtered_graph_links)
        })
        .collect();

    Ok(NodesAndLinks {
        node_count: filtered_nodes,
        is_limited: type_graph.node_count > max_nodes,
        links_by_type: filtered_links,
    })
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GraphStats {
    pub link: IndexMap<LinkKind, CountAndMax>,
    pub node: IndexMap<NodeStatKind, CountAndMax>,
}

#[tauri::command]
pub async fn get_type_graph_stats(state: State<'_, &Mutex<AppData>>) -> Result<GraphStats, String> {
    let app_data = state.lock().await;

    let type_graph = app_data
        .type_graph
        .as_ref()
        .ok_or_else(|| "type graph unavailable".to_string())?;
    Ok(GraphStats {
        link: type_graph.calculate_link_count_and_max(),
        node: type_graph.calculate_node_stat_count_and_max(),
    })
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeAndLinkStats {
    pub node_stats: IndexMap<NodeStatKind, NodeStatKindData>,
    pub link_stats: IndexMap<LinkKind, LinkKindData>,
    pub path_map: IndexMap<TypeId, String>,
}

/// this command is for building the award winners page more efficiently (don't want to send the full stats)
#[tauri::command]
pub async fn get_type_graph_limited_node_and_link_stats(
    state: State<'_, &Mutex<AppData>>,
) -> Result<NodeAndLinkStats, String> {
    let app_data = state.lock().await;

    let type_graph = app_data
        .type_graph
        .as_ref()
        .ok_or_else(|| "type graph unavailable".to_string())?;

    // go through type_graph.node_data_by_kind and type_graph.link_kind_data_by_kind
    // and limit to the first 100 entries for each kind
    let limited_node_stats = type_graph
        .node_data_by_kind
        .clone()
        .into_iter()
        .map(|(kind, mut kind_data)| {
            // limit kind_data.nodes to first 100 entries
            kind_data.nodes = kind_data.nodes.into_iter().take(100).collect();
            (kind, kind_data)
        })
        .collect();
    let limited_link_stats = type_graph
        .link_kind_data_by_kind
        .clone()
        .into_iter()
        .map(|(kind, mut kind_data)| {
            // limit parent_link_data.target_to_sources to first 100 entries
            kind_data.by_target.target_to_sources = kind_data
                .by_target
                .target_to_sources
                .into_iter()
                .take(100)
                .collect();
            (kind, kind_data)
        })
        .collect();

    Ok(NodeAndLinkStats {
        node_stats: limited_node_stats,
        link_stats: limited_link_stats,
        path_map: type_graph.path_map.clone(),
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
