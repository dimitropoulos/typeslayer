// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Check if running in MCP server mode
    let args: Vec<String> = std::env::args().collect();

    if args.len() > 1 && args[1] == "mcp" {
        // Run as MCP server (STDIO mode)
        if let Err(e) = typeslayer_lib::run_mcp_server() {
            eprintln!("MCP server error: {}", e);
            std::process::exit(1);
        }
    } else {
        // Run as GUI application
        typeslayer_lib::run()
    }
}
