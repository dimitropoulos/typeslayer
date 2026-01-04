mod analytics;
mod analyze_trace;
pub mod app_data;
mod commands;
mod http_server;
mod layercake;
pub mod log;
mod mcp;
mod process_controller;
mod treemap;
mod type_graph;
pub mod utils;
mod validate;

#[cfg(test)]
mod export_types;

use crate::process_controller::ProcessController;
use tauri::Manager;
use tokio::sync::Mutex;

pub use http_server::run_http_server;
pub use mcp::run_mcp_server;

use crate::utils::compute_window_title;

pub async fn run_tauri_app(app_data: &'static Mutex<app_data::AppData>) {
    let app = app_data.lock().await;
    let project_root = app.project_root.clone();
    drop(app);

    let title = compute_window_title(project_root).await;

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_upload::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_screenshots::init())
        .setup(move |app| {
            app.manage(ProcessController::new());
            app.manage(app_data);

            // Initialize MCP status tracker
            let mcp_tracker = mcp::status::McpStatusTracker::new();
            app.manage(mcp_tracker);

            // Set initial window title based on detected project package.json
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.set_title(&title);
            }
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::actions::open_file,
            commands::actions::take_screenshot,
            commands::app_data::clear_outputs,
            commands::app_data::get_analyze_trace,
            commands::app_data::get_cpu_profile,
            commands::app_data::get_data_dir,
            commands::app_data::get_project_root,
            commands::app_data::get_selected_tsconfig,
            commands::app_data::get_trace_json,
            commands::app_data::get_tsconfig_paths,
            commands::app_data::get_type_graph_limited_node_and_link_stats,
            commands::app_data::get_type_graph_nodes_and_links,
            commands::app_data::get_type_graph_stats,
            commands::app_data::set_project_root,
            commands::app_data::set_selected_tsconfig,
            commands::bug_report::create_bug_report,
            commands::bug_report::get_bug_report_files,
            commands::bug_report::upload_bug_report,
            commands::generate::cancel_generation,
            commands::generate::generate_all,
            commands::generate::generate_analyze_trace,
            commands::generate::generate_cpu_profile,
            commands::generate::generate_trace,
            commands::generate::generate_type_graph,
            commands::mcp::get_available_mcp_resources,
            commands::mcp::get_available_mcp_tools,
            commands::mcp::get_mcp_running_tools,
            commands::preview::get_analyze_trace_preview,
            commands::preview::get_cpu_profile_preview,
            commands::preview::get_trace_json_preview,
            commands::preview::get_type_graph_preview,
            commands::preview::get_types_json_preview,
            commands::query::get_links_to_type_id,
            commands::query::get_recursive_resolved_types,
            commands::query::get_resolved_type_by_id,
            commands::query::get_resolved_types_by_ids,
            commands::query::get_traces_related_to_typeid,
            commands::settings::get_analytics_consent,
            commands::settings::get_apply_tsc_project_flag,
            commands::settings::get_default_extra_tsc_flags,
            commands::settings::get_extra_tsc_flags,
            commands::settings::get_max_nodes,
            commands::settings::get_max_old_space_size,
            commands::settings::get_max_stack_size,
            commands::settings::get_prefer_editor_open,
            commands::settings::get_preferred_editor,
            commands::settings::get_relative_paths,
            commands::settings::get_typescript_compiler_variant,
            commands::settings::get_version,
            commands::settings::set_analytics_consent,
            commands::settings::set_apply_tsc_project_flag,
            commands::settings::set_extra_tsc_flags,
            commands::settings::set_max_nodes,
            commands::settings::set_max_old_space_size,
            commands::settings::set_max_stack_size,
            commands::settings::set_prefer_editor_open,
            commands::settings::set_preferred_editor,
            commands::settings::set_relative_paths,
            commands::settings::set_typescript_compiler_variant,
            commands::treemap::get_treemap_data,
            commands::trivia::get_app_stats,
            commands::trivia::get_available_editors,
            commands::trivia::get_link_kind_data_by_kind,
            commands::trivia::get_output_file_sizes,
            commands::trivia::get_tsc_example_call,
            commands::trivia::get_type_kinds,
            commands::upload::upload_analyze_trace,
            commands::upload::upload_cpu_profile,
            commands::upload::upload_trace_json,
            commands::upload::upload_type_graph,
            commands::upload::upload_types_json,
            commands::validate::validate_analyze_trace,
            commands::validate::validate_cpu_profile,
            commands::validate::validate_trace_json,
            commands::validate::validate_type_graph,
            commands::validate::validate_types_json,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
