mod analyze_trace;
mod app_data;
mod auth;
mod files;
mod layercake;
mod log;
mod type_graph;
mod validate;

use std::sync::Mutex;
use tauri::AppHandle;
use tauri::Manager;
use tauri::async_runtime::spawn;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    log::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_upload::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let app_handle = app.app_handle().clone();
            let app_data = app_data::AppData::new(&app_handle);
            app.manage(Mutex::new(app_data));

            // Spawn a lightweight HTTP server to serve runtime outputs
            let outputs_app = app.app_handle().clone();
            spawn(async move {
                use axum::{Router, extract::Path, response::IntoResponse, routing::get};
                use tower_http::cors::{Any, CorsLayer};
                // no file service needed; direct read from outputs

                // Explicit handler to set correct content type for known files
                async fn serve_output(
                    Path(name): Path<String>,
                    app: AppHandle,
                ) -> impl IntoResponse {
                    let base = app_data::AppData::get_outputs_dir(&app);
                    let path = std::path::Path::new(&base).join(&name);
                    match tokio::fs::read(&path).await {
                        Ok(bytes) => {
                            let content_type = if name.ends_with(".json") {
                                "application/json"
                            } else {
                                "application/octet-stream"
                            };
                            ([("Content-Type", content_type)], bytes)
                        }
                        Err(e) => {
                            eprintln!("Failed to read {:?}: {}", path, e);
                            ([("Content-Type", "text/plain")], Vec::new())
                        }
                    }
                }

                let cors = CorsLayer::new().allow_methods(Any).allow_origin(Any);
                let app_router = Router::new()
                    .route(
                        "/outputs/:name",
                        get({
                            let app = outputs_app.clone();
                            move |p| serve_output(p, app.clone())
                        }),
                    )
                    .layer(cors);

                // Bind to localhost fixed port for simplicity
                let listener = tokio::net::TcpListener::bind("127.0.0.1:4765")
                    .await
                    .expect("bind outputs server");
                if let Err(e) = axum::serve(listener, app_router.into_make_service()).await {
                    eprintln!("outputs server error: {}", e);
                }
            });
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            auth::validate_auth_code,
            auth::is_authenticated,
            app_data::validate_types_json,
            app_data::validate_trace_json,
            app_data::get_trace_json,
            app_data::get_type_instantiation_limits,
            app_data::get_recursive_type_related_to_limits,
            app_data::get_type_related_to_discriminated_type_limits,
            app_data::get_types_json,
            app_data::search_type,
            app_data::get_scripts,
            app_data::get_typecheck_script_name,
            app_data::set_typecheck_script_name,
            app_data::generate_trace,
            app_data::generate_cpu_profile,
            app_data::get_analyze_trace,
            app_data::get_cpu_profile,
            app_data::get_simplify_paths,
            app_data::set_simplify_paths,
            app_data::get_prefer_editor_open,
            app_data::set_prefer_editor_open,
            app_data::get_auto_start,
            app_data::set_auto_start,
            app_data::open_file,
            app_data::analyze_trace_command,
            app_data::get_available_editors,
            app_data::get_preferred_editor,
            app_data::set_preferred_editor,
            files::get_current_dir,
            files::get_project_root,
            files::set_project_root,
            app_data::verify_analyze_trace,
            app_data::verify_cpu_profile,
            app_data::get_types_json_text,
            app_data::get_trace_json_text,
            app_data::get_analyze_trace_text,
            app_data::get_cpu_profile_text,
            type_graph::build_type_graph,
            type_graph::get_type_graph,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
