mod analyze_trace;
pub mod app_data;
mod auth;
pub mod files;
mod http_server;
mod layercake;
pub mod log;
mod mcp;
mod process_controller;
mod screenshot;
mod treemap;
mod type_graph;
mod utils;
mod validate;

use std::sync::{Arc, Mutex};
use tauri::Manager;

pub use http_server::run_http_server;
pub use mcp::run_mcp_server;

pub fn run_tauri_app(app_data: Arc<Mutex<app_data::AppData>>) {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_upload::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_screenshots::init())
        .setup(move |app| {
            app.manage(app_data);

            // Initialize MCP status tracker
            let mcp_tracker = mcp::status::McpStatusTracker::new();
            app.manage(mcp_tracker);

            // Set initial window title based on detected project package.json
            if let Some(title) = app
                .state::<Arc<Mutex<app_data::AppData>>>()
                .lock()
                .ok()
                .map(|data| data.compute_window_title())
            {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.set_title(&title);
                }
            }

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            app_data::clear_outputs,
            app_data::create_bug_report,
            app_data::generate_analyze_trace,
            app_data::generate_cpu_profile,
            app_data::generate_trace,
            app_data::get_analyze_trace,
            app_data::get_analyze_trace_text,
            app_data::get_auto_start,
            app_data::get_available_editors,
            app_data::get_bug_report_files,
            app_data::get_cpu_profile,
            app_data::get_cpu_profile_text,
            app_data::get_data_dir,
            app_data::get_default_extra_tsc_flags,
            app_data::get_extra_tsc_flags,
            app_data::get_prefer_editor_open,
            app_data::get_preferred_editor,
            app_data::get_relative_paths,
            app_data::get_selected_tsconfig,
            app_data::get_apply_tsc_project_flag,
            app_data::get_trace_json,
            app_data::get_trace_json_text,
            app_data::get_treemap_data,
            app_data::get_tsc_example_call,
            app_data::get_tsconfig_paths,
            app_data::get_types_json,
            app_data::get_types_json_text,
            app_data::open_file,
            app_data::search_type,
            app_data::set_auto_start,
            app_data::set_extra_tsc_flags,
            app_data::set_prefer_editor_open,
            app_data::set_preferred_editor,
            app_data::set_relative_paths,
            app_data::set_selected_tsconfig,
            app_data::set_apply_tsc_project_flag,
            app_data::set_window_title_from_project,
            app_data::upload_analyze_trace,
            app_data::upload_cpu_profile,
            app_data::upload_trace_json,
            app_data::upload_type_graph,
            app_data::upload_types_json,
            app_data::validate_trace_json,
            app_data::validate_types_json,
            app_data::verify_analyze_trace,
            app_data::verify_cpu_profile,
            auth::is_authorized,
            auth::validate_auth_code,
            files::get_current_dir,
            files::get_output_file_sizes,
            files::get_project_root,
            files::set_project_root,
            mcp::status::get_available_mcp_resources,
            mcp::status::get_available_mcp_tools,
            mcp::status::get_mcp_running_tools,
            screenshot::take_screenshot,
            type_graph::generate_type_graph,
            type_graph::get_type_graph,
            type_graph::get_type_graph_text,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
