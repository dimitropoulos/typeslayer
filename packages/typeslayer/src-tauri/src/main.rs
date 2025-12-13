// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::{Arc, Mutex};

fn main() -> Result<(), String> {
    let data_dir = typeslayer_lib::files::get_typeslayer_base_data_dir();

    // Create AppData as the root of our application (single instance shared by all components)
    let app_data = Arc::new(Mutex::new(typeslayer_lib::app_data::AppData::new(
        data_dir,
    )?));

    let args: Vec<String> = std::env::args().collect();
    let is_mcp_mode = args.len() > 1 && args[1] == "mcp";
    if is_mcp_mode {
        // Run as MCP server (STDIO mode) with shared AppData
        // In MCP mode, stdout is reserved for JSON-RPC protocol, so no HTTP server or GUI
        if let Err(e) = typeslayer_lib::run_mcp_server(app_data) {
            eprintln!("MCP server error: {}", e);
            std::process::exit(1);
        }
    } else {
        // GUI mode: Spawn HTTP server and Tauri app with shared AppData

        // Initialize logging first
        typeslayer_lib::log::init();

        // Clone for HTTP server
        let app_data_for_http = app_data.clone();

        // Spawn HTTP server in background with better error handling
        std::thread::spawn(move || {
            let runtime = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
            runtime.block_on(async {
                match typeslayer_lib::run_http_server(app_data_for_http).await {
                    Ok(_) => println!("HTTP server stopped gracefully"),
                    Err(e) => {
                        eprintln!("HTTP server error: {}", e);
                        eprintln!("The app will continue but file serving won't work");
                    }
                }
            });
        });

        // Give the HTTP server a moment to bind to the port
        std::thread::sleep(std::time::Duration::from_millis(100));

        // Run Tauri GUI app with the shared AppData
        typeslayer_lib::run_tauri_app(app_data);
    }

    Ok(())
}
