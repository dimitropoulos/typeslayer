use crate::analyze_trace::constants::ANALYZE_TRACE_FILENAME;
use crate::app_data::AppData;
use crate::validate::utils::CPU_PROFILE_FILENAME;
use crate::validate::{trace_json::TRACE_JSON_FILENAME, types_json::TYPES_JSON_FILENAME};
use std::path::PathBuf;
use tauri::State;
use tokio::io::AsyncReadExt;
use tokio::sync::Mutex;
use tracing::debug;

pub async fn get_output_file_preview(path: &PathBuf) -> Result<String, String> {
    let mut file = tokio::fs::File::open(path)
        .await
        .map_err(|e| format!("Failed to open {}: {}", path.display(), e))?;
    let mut buf = vec![0u8; 1024 * 100]; // 100 KiB
    let n = file
        .read(&mut buf)
        .await
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
    buf.truncate(n);
    debug!(
        "[get_output_file_preview]: read {} bytes from {}",
        n,
        path.display()
    );
    String::from_utf8(buf).map_err(|e| format!("Invalid UTF-8: {}", e))
}

#[tauri::command]
pub async fn get_types_json_preview(
    state: State<'_, &Mutex<AppData>>,
) -> Result<String, String> {
    let data = state.lock().await;
    let filepath = data.outputs_dir().join(TYPES_JSON_FILENAME);
    get_output_file_preview(&filepath).await
}

#[tauri::command]
pub async fn get_trace_json_preview(
    state: State<'_, &Mutex<AppData>>,
) -> Result<String, String> {
    let data = state.lock().await;
    let filepath = data.outputs_dir().join(TRACE_JSON_FILENAME);
    get_output_file_preview(&filepath).await
}

#[tauri::command]
pub async fn get_analyze_trace_preview(
    state: State<'_, &Mutex<AppData>>,
) -> Result<String, String> {
    let data = state.lock().await;
    let filepath = data.outputs_dir().join(ANALYZE_TRACE_FILENAME);
    get_output_file_preview(&filepath).await
}

#[tauri::command]
pub async fn get_cpu_profile_preview(
    state: State<'_, &Mutex<AppData>>,
) -> Result<String, String> {
    let data = state.lock().await;
    let filepath = data.outputs_dir().join(CPU_PROFILE_FILENAME);
    get_output_file_preview(&filepath).await
}

#[tauri::command]
pub async fn get_type_graph_preview(
    state: State<'_, &Mutex<AppData>>,
) -> Result<String, String> {
    let data = state.lock().await;
    let filepath = data
        .outputs_dir()
        .join(crate::type_graph::TYPE_GRAPH_FILENAME);
    get_output_file_preview(&filepath).await
}
