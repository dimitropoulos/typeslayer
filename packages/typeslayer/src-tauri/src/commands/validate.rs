use crate::analyze_trace::constants::ANALYZE_TRACE_FILENAME;
use crate::app_data::AppData;
use crate::validate::utils::CPU_PROFILE_FILENAME;
use crate::validate::{
    trace_json::{TRACE_JSON_FILENAME, read_trace_json},
    types_json::{TYPES_JSON_FILENAME, load_types_json},
};
use std::sync::{Arc, Mutex};
use tauri::State;
use tracing::debug;

#[tauri::command]
pub async fn validate_types_json(state: State<'_, Arc<Mutex<AppData>>>) -> Result<(), String> {
    let path = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.outputs_dir()
            .join(TYPES_JSON_FILENAME.trim_start_matches('/'))
            .to_string_lossy()
            .to_string()
    };
    load_types_json(path).await?;
    Ok(())
}

#[tauri::command]
pub async fn validate_trace_json(state: State<'_, Arc<Mutex<AppData>>>) -> Result<(), String> {
    let path = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.outputs_dir()
            .join(TRACE_JSON_FILENAME.trim_start_matches('/'))
            .to_string_lossy()
            .to_string()
    };
    read_trace_json(&path).await?;
    Ok(())
}

#[tauri::command]
pub fn validate_type_graph(state: State<'_, Arc<Mutex<AppData>>>) -> Result<bool, String> {
    let data = state
        .lock()
        .map_err(|_| "AppData mutex poisoned".to_string())?;
    if data.type_graph.is_some() {
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub async fn verify_analyze_trace(state: State<'_, Arc<Mutex<AppData>>>) -> Result<(), String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    match &data.analyze_trace {
        Some(v) => {
            let json = serde_json::to_string(v).map_err(|e| e.to_string())?;
            if json.trim().is_empty() {
                Err(format!("{} appears empty", ANALYZE_TRACE_FILENAME).to_string())
            } else {
                debug!(
                    "[verify_analyze_trace] {} has size {} bytes",
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
pub async fn verify_trace_json(state: State<'_, Arc<Mutex<AppData>>>) -> Result<(), String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    if data.trace_json.is_empty() {
        Err(format!("{} is empty", TRACE_JSON_FILENAME).to_string())
    } else {
        debug!("[verify_trace_json] {} trace events", data.trace_json.len());
        Ok(())
    }
}

#[tauri::command]
pub async fn verify_types_json(state: State<'_, Arc<Mutex<AppData>>>) -> Result<(), String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    if data.types_json.is_empty() {
        Err(format!("{} is empty", TYPES_JSON_FILENAME).to_string())
    } else {
        debug!("[verify_types_json] {} types", data.types_json.len());
        Ok(())
    }
}

#[tauri::command]
pub async fn verify_cpu_profile(state: State<'_, Arc<Mutex<AppData>>>) -> Result<(), String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    match &data.cpu_profile {
        Some(contents) => {
            if contents.trim().is_empty() {
                Err(format!("{} is empty", CPU_PROFILE_FILENAME).to_string())
            } else {
                debug!("[verify_cpu_profile] size {} bytes", contents.len());
                Ok(())
            }
        }
        None => Err(format!("{} not loaded", CPU_PROFILE_FILENAME).to_string()),
    }
}
