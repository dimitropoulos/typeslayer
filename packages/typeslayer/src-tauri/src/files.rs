use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

use crate::app_data::AppData;

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
pub async fn set_project_root(
    app: AppHandle,
    state: State<'_, Mutex<AppData>>,
    project_root: String,
) -> Result<(), String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.update_project_root(project_root);
    // Update window title from backend whenever project root changes
    if let Some(title) = data.compute_window_title() {
        if let Some(win) = app.get_webview_window("main") {
            let _ = win.set_title(&title);
        }
    }
    Ok(())
}
