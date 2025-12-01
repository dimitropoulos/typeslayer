use tauri::{AppHandle, Manager, WebviewWindow};

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
