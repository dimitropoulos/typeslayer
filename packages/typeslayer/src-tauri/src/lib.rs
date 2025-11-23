#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_current_dir() -> Result<String, String> {
    if let Ok(user_cwd) = std::env::var("USER_CWD") {
        return Ok(user_cwd);
    }

    std::env::current_dir()
        .map(|path| path.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, get_current_dir])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
