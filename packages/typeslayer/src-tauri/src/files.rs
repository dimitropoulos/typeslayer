use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State};

use crate::{
    analyze_trace::constants::ANALYZE_TRACE_FILENAME,
    app_data::AppData,
    type_graph::TYPE_GRAPH_FILENAME,
    validate::{
        trace_json::TRACE_JSON_FILENAME, types_json::TYPES_JSON_FILENAME,
        utils::CPU_PROFILE_FILENAME,
    },
};

pub const OUTPUTS_DIRECTORY: &str = "outputs";

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
pub async fn get_project_root(state: State<'_, Arc<Mutex<AppData>>>) -> Result<String, String> {
    state
        .lock()
        .map(|data| data.project_root.clone())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_project_root(
    app: AppHandle,
    state: State<'_, Arc<Mutex<AppData>>>,
    project_root: String,
) -> Result<(), String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;
    data.update_project_root(project_root);

    if let Some(win) = app.get_webview_window("main") {
        let _ = win.set_title(&data.compute_window_title());
    }
    Ok(())
}

pub fn get_typeslayer_base_data_dir() -> String {
    if let Ok(env_dir) = std::env::var("TYPESLAYER_DATA_DIR") {
        env_dir
    } else {
        #[cfg(target_os = "linux")]
        {
            if let Ok(home) = std::env::var("HOME") {
                return format!("{}/.local/share/typeslayer", home);
            }
        }
        #[cfg(target_os = "macos")]
        {
            if let Ok(home) = std::env::var("HOME") {
                return format!("{}/Library/Application Support/typeslayer", home);
            }
        }
        #[cfg(target_os = "windows")]
        {
            if let Ok(appdata) = std::env::var("APPDATA") {
                return format!("{}\\typeslayer", appdata);
            }
        }
        // Fallback
        "./typeslayer".to_string()
    }
}

#[tauri::command]
pub async fn get_output_file_sizes(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<std::collections::HashMap<String, u64>, String> {
    use std::fs;

    let outputs_dir = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.outputs_dir().to_string_lossy().to_string()
    };

    let filenames = vec![
        ANALYZE_TRACE_FILENAME,
        TRACE_JSON_FILENAME,
        TYPES_JSON_FILENAME,
        CPU_PROFILE_FILENAME,
        TYPE_GRAPH_FILENAME,
    ];

    let mut sizes = std::collections::HashMap::new();

    for filename in filenames {
        let path = std::path::Path::new(&outputs_dir).join(filename);
        if let Ok(metadata) = fs::metadata(&path) {
            sizes.insert(filename.to_string(), metadata.len());
        }
    }

    Ok(sizes)
}
