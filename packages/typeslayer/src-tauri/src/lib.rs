mod app_data;
mod cli;
mod files;
mod validate;

use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_data = Mutex::new(app_data::AppData::new());

    tauri::Builder::default()
        .manage(app_data)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            app_data::validate_types_json,
            app_data::validate_trace_json,
            app_data::get_trace_json,
            app_data::get_types_json,
            app_data::search_type,
            app_data::get_scripts,
            app_data::get_typecheck_script_name,
            app_data::set_typecheck_script_name,
            app_data::generate_trace,
            app_data::generate_cpu_profile,
            files::get_current_dir,
            files::get_project_root,
            files::set_project_root,
            files::get_temp_dir,
            files::set_temp_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
