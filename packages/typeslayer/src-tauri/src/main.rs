// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tokio::sync::Mutex;

use typeslayer_lib::{app_data::AppData, run_tauri_app, utils::get_typeslayer_base_data_dir};

#[tokio::main]
async fn main() -> Result<(), String> {
    let data_dir = get_typeslayer_base_data_dir();

    // Create AppData as the root of our application (single instance shared by all components)
    let app_data = &*Box::leak(Box::new(Mutex::new(AppData::new(data_dir).await?)));

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

        // The listener is bound here to make sure the address is open for connections.
        let listener = tokio::net::TcpListener::bind("127.0.0.1:4765")
            .await
            .map_err(|e| e.to_string())?;

        // Spawn HTTP server in background with better error handling
        tokio::task::spawn(async move {
            match typeslayer_lib::run_http_server(app_data, listener).await {
                Ok(_) => println!("HTTP server stopped gracefully"),
                Err(e) => {
                    eprintln!("HTTP server error: {}", e);
                    eprintln!("The app will continue but file serving won't work");
                }
            }
        });

        // Run Tauri GUI app with the shared AppData
        run_tauri_app(app_data).await;
    }

    Ok(())
}
