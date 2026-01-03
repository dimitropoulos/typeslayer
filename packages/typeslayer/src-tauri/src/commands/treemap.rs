use crate::{
    app_data::AppData,
    treemap::{TreemapNode, build_treemap_from_trace},
};
use tauri::State;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn get_treemap_data(
    state: State<'_, &Mutex<AppData>>,
) -> Result<Vec<TreemapNode>, String> {
    let app_data = state.lock().await;
    let treemap_data = build_treemap_from_trace(&app_data.trace_json)?;
    Ok(treemap_data)
}
