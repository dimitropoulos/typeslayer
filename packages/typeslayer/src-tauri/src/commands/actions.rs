use crate::{
    app_data::AppData,
    layercake::ResolveStringArgs,
    utils::{AVAILABLE_EDITORS, command_exists, compute_window_title},
};
use std::{path::Path};
use tauri::State;
use tauri::{AppHandle, Manager, WebviewWindow};
use tokio::{process::Command, sync::Mutex};

#[tauri::command]
pub async fn take_screenshot(app: AppHandle) -> Result<String, String> {
    // Get the main Tauri window
    let tauri_window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;

    // Take screenshot using xcap
    let screenshot_bytes = capture_window_to_png(&tauri_window)?;

    // Get downloads directory
    let downloads_dir = dirs::download_dir().ok_or("Could not find downloads directory")?;

    // Generate filename with timestamp
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let filename = format!("typeslayer_{}.png", timestamp);
    let screenshot_path = downloads_dir.join(&filename);

    // Save to file
    std::fs::write(&screenshot_path, &screenshot_bytes)
        .map_err(|e| format!("Failed to save screenshot: {}", e))?;

    // Copy image data to clipboard
    use tauri_plugin_clipboard_manager::ClipboardExt;

    let path_str = screenshot_path.to_string_lossy().to_string();

    // Decode PNG to get RGBA data for clipboard
    let img = image::load_from_memory(&screenshot_bytes)
        .map_err(|e| format!("Failed to decode image: {}", e))?;
    let rgba_img = img.to_rgba8();
    let (width, height) = rgba_img.dimensions();
    let rgba_data = rgba_img.into_raw();

    // Create Tauri Image from RGBA data
    let clipboard_image = tauri::image::Image::new(&rgba_data, width, height);

    app.clipboard()
        .write_image(&clipboard_image)
        .map_err(|e| format!("Failed to copy image to clipboard: {}", e))?;

    Ok(path_str)
}

fn capture_window_to_png<R: tauri::Runtime>(window: &WebviewWindow<R>) -> Result<Vec<u8>, String> {
    use xcap::Window;

    // Get window title to match against xcap windows
    let window_title = window.title().map_err(|e| e.to_string())?;

    // Get all system windows
    let windows = Window::all().map_err(|e| e.to_string())?;

    // Find our window by title
    let xcap_window = windows
        .into_iter()
        .find(|w| w.title().contains(&window_title))
        .ok_or("Could not find window for screenshot")?;

    // Capture the image
    let image = xcap_window.capture_image().map_err(|e| e.to_string())?;

    // Convert to PNG bytes
    let mut png_bytes = Vec::new();
    image
        .write_to(
            &mut std::io::Cursor::new(&mut png_bytes),
            image::ImageFormat::Png,
        )
        .map_err(|e| e.to_string())?;

    Ok(png_bytes)
}

#[tauri::command]
pub async fn open_file(state: State<'_, &Mutex<AppData>>, path: String) -> Result<(), String> {
    let data = state.lock().await;

    // Extract settings without holding the lock during blocking operations.
    let prefer_editor = data.settings.prefer_editor_open;

    // Resolve editor via precedence using the app's cake (Env > Flag > File)
    let cli_or_env_editor = {
        let v = data.cake.resolve_string(ResolveStringArgs {
            env: "EDITOR",
            flag: "--editor",
            file: "settings.preferredEditor",
            default: || "".to_string(),
            validate: |s| Ok(s.to_string()),
        });
        if v.is_empty() { None } else { Some(v) }
    };

    // Separate the file path from optional :line:char suffix for existence checks.
    let (file_path, _line_char_suffix) = {
        // Accept paths like /abs/path.ts:123:5
        let mut parts = path.split(':');
        let first = parts.next().unwrap_or("").to_string();
        (first, parts.collect::<Vec<_>>())
    };

    if file_path.is_empty() {
        return Err("Empty path".to_string());
    }
    if !Path::new(&file_path).exists() {
        return Err(format!("Path does not exist: {file_path}"));
    }

    if prefer_editor {
        // Built-in available editors list
        let available_editors: Vec<(String, String)> = AVAILABLE_EDITORS
            .iter()
            .map(|(c, n)| (c.to_string(), n.to_string()))
            .collect();
        // Determine editor to use: CLI/env > preferred_editor > first available
        let editor_to_use = cli_or_env_editor
            .or_else(|| data.settings.preferred_editor.clone())
            .or_else(|| available_editors.first().map(|(cmd, _)| cmd.clone()));

        // Build list of editors to try
        let editors_to_try: Vec<String> = if let Some(ref editor) = editor_to_use {
            let mut eds = vec![editor.clone()];
            for (cmd, _label) in &available_editors {
                if cmd != editor {
                    eds.push(cmd.clone());
                }
            }
            eds
        } else {
            available_editors
                .iter()
                .map(|(cmd, _)| cmd.clone())
                .collect()
        };

        // Try each editor in order
        for ed in editors_to_try.iter() {
            if !command_exists(ed).await {
                continue;
            }
            // VS Code supports --goto path:line:col; others we just pass file path.
            let attempt = if ed == "code" { &path } else { &file_path };
            let status = if ed == "code" {
                Command::new(ed).arg("--goto").arg(attempt).status()
            } else {
                Command::new(ed).arg(attempt).status()
            };
            match status.await {
                Ok(s) if s.success() => return Ok(()),
                _ => continue,
            }
        }
        // Fall through to system opener if editors failed.
    }

    // System fallback (xdg-open/open/start) to let OS decide.
    #[cfg(target_os = "linux")]
    let fallback_status = Command::new("xdg-open").arg(&file_path).status();
    #[cfg(target_os = "macos")]
    let fallback_status = Command::new("open").arg(&file_path).status();
    #[cfg(target_os = "windows")]
    let fallback_status = Command::new("cmd")
        .arg("/C")
        .arg("start")
        .arg("")
        .arg(&file_path)
        .status();

    match fallback_status.await {
        Ok(s) if s.success() => Ok(()),
        _ => Err("Failed to open file with any known method".to_string()),
    }
}

#[tauri::command]
pub async fn set_window_title_from_project(
    app: tauri::AppHandle,
    state: State<'_, &Mutex<AppData>>,
) -> Result<(), String> {
    let guard = state.lock().await;
    let title = compute_window_title(guard.project_root.clone());
    let win = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;
    win.set_title(&title)
        .map_err(|e| format!("failed to set title: {}", e))
}
