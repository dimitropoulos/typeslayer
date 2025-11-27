use std::sync::Mutex;
use tauri::State;

use crate::app_data::AppData;

pub const TEMP_DIR_NAME: &'static str = "typeslayer";

#[tauri::command]
pub async fn get_current_dir() -> Result<String, String> {
    if let Ok(user_cwd) = std::env::var("USER_CWD") {
        return Ok(user_cwd);
    }

    std::env::current_dir()
        .map(|path| path.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_project_root(state: State<'_, Mutex<AppData>>) -> Result<String, String> {
    state
        .lock()
        .map(|data| data.project_root.clone())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_temp_dir(state: State<'_, Mutex<AppData>>) -> Result<String, String> {
    state
        .lock()
        .map(|data| data.temp_dir.clone())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_project_root(
    state: State<'_, Mutex<AppData>>,
    project_root: String,
) -> Result<(), String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;
    let normalized = normalize_path(project_root);
    data.update_project_root(normalized);
    Ok(())
}

#[tauri::command]
pub async fn set_temp_dir(
    state: State<'_, Mutex<AppData>>,
    temp_dir: String,
) -> Result<(), String> {
    state
        .lock()
        .map(|mut data| {
            data.temp_dir = normalize_path(temp_dir);
        })
        .map_err(|e| e.to_string())
}

pub fn normalize_path(mut path: String) -> String {
    // Strip trailing /package.json if present
    if path.ends_with("/package.json") {
        path.truncate(path.len() - "package.json".len());
    } else if path.ends_with("package.json") {
        path.truncate(path.len() - "package.json".len());
        // Ensure trailing slash after stripping
        if !path.ends_with('/') && !path.is_empty() {
            path.push('/');
        }
    }

    // Ensure trailing slash
    if !path.ends_with('/') {
        path.push('/');
    }
    path
}
