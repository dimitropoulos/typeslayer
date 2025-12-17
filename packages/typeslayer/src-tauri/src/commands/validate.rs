use crate::analyze_trace::constants::ANALYZE_TRACE_FILENAME;
use crate::app_data::AppData;
use crate::validate::utils::CPU_PROFILE_FILENAME;
use crate::validate::{
    trace_json::TRACE_JSON_FILENAME,
    types_json::{TYPES_JSON_FILENAME, load_types_json},
};
use tauri::State;
use tokio::sync::Mutex;
use tracing::debug;

#[tauri::command]
pub async fn validate_analyze_trace(state: State<'_, &Mutex<AppData>>) -> Result<(), String> {
    let data = state.lock().await;
    match &data.analyze_trace {
        Some(v) => {
            let json = serde_json::to_string(v).map_err(|e| e.to_string())?;
            if json.trim().is_empty() {
                Err(format!("{} appears empty", ANALYZE_TRACE_FILENAME).to_string())
            } else {
                debug!(
                    "[validate_analyze_trace] {} has size {} bytes",
                    ANALYZE_TRACE_FILENAME,
                    json.len()
                );
                Ok(())
            }
        }
        None => Err(format!("{} not loaded", ANALYZE_TRACE_FILENAME).to_string()),
    }
}

#[tauri::command]
pub async fn validate_trace_json(state: State<'_, &Mutex<AppData>>) -> Result<(), String> {
    let data = state.lock().await;
    if data.trace_json.is_empty() {
        Err(format!("{} is empty", TRACE_JSON_FILENAME).to_string())
    } else {
        debug!(
            "[validate_trace_json] {} trace events",
            data.trace_json.len()
        );
        Ok(())
    }
}

#[tauri::command]
pub async fn validate_types_json(state: State<'_, &Mutex<AppData>>) -> Result<(), String> {
    let path = {
        let data = state.lock().await;
        data.outputs_dir()
            .join(TYPES_JSON_FILENAME.trim_start_matches('/'))
            .to_string_lossy()
            .to_string()
    };
    load_types_json(path).await?;
    Ok(())
}

#[tauri::command]
pub async fn validate_cpu_profile(state: State<'_, &Mutex<AppData>>) -> Result<(), String> {
    let data = state.lock().await;
    match &data.cpu_profile {
        Some(contents) => {
            if contents.trim().is_empty() {
                Err(format!("{} is empty", CPU_PROFILE_FILENAME).to_string())
            } else {
                debug!("[validate_cpu_profile] size {} bytes", contents.len());
                Ok(())
            }
        }
        None => Err(format!("{} not loaded", CPU_PROFILE_FILENAME).to_string()),
    }
}

#[tauri::command]
pub async fn validate_type_graph(_state: State<'_, &Mutex<AppData>>) -> Result<(), String> {
    Ok(())
}
