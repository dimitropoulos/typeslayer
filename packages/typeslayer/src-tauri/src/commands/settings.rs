use crate::{
    app_data::{AppData, settings::TypeScriptCompilerVariant},
    utils::{AVAILABLE_EDITORS, default_extra_tsc_flags},
};
use std::str::FromStr;
use tauri::State;
use tokio::sync::Mutex;
use tracing::debug;

#[tauri::command]
pub async fn get_relative_paths(state: State<'_, &Mutex<AppData>>) -> Result<bool, String> {
    let data = state.lock().await;
    debug!(
        "[get_relative_paths] returning {}",
        data.settings.relative_paths
    );
    Ok(data.settings.relative_paths)
}

#[tauri::command]
pub async fn set_relative_paths(
    state: State<'_, &Mutex<AppData>>,
    value: bool,
) -> Result<(), String> {
    let mut data = state.lock().await;
    data.settings.relative_paths = value;
    debug!("[set_relative_paths] set to {}", value);
    data.update_typeslayer_config_toml().await;
    Ok(())
}

#[tauri::command]
pub async fn get_prefer_editor_open(state: State<'_, &Mutex<AppData>>) -> Result<bool, String> {
    let data = state.lock().await;
    Ok(data.settings.prefer_editor_open)
}

#[tauri::command]
pub async fn set_prefer_editor_open(
    state: State<'_, &Mutex<AppData>>,
    value: bool,
) -> Result<(), String> {
    let mut data = state.lock().await;
    data.settings.prefer_editor_open = value;
    data.update_typeslayer_config_toml().await;
    Ok(())
}

#[tauri::command]
pub async fn get_auto_start(state: State<'_, &Mutex<AppData>>) -> Result<bool, String> {
    let data = state.lock().await;
    Ok(data.settings.auto_start)
}

#[tauri::command]
pub async fn set_auto_start(state: State<'_, &Mutex<AppData>>, value: bool) -> Result<(), String> {
    let mut data = state.lock().await;
    data.settings.auto_start = value;
    data.update_typeslayer_config_toml().await;
    Ok(())
}

#[tauri::command]
pub async fn get_preferred_editor(
    state: State<'_, &Mutex<AppData>>,
) -> Result<Option<String>, String> {
    let data = state.lock().await;
    Ok(data.settings.preferred_editor.clone())
}

#[tauri::command]
pub async fn set_preferred_editor(
    state: State<'_, &Mutex<AppData>>,
    editor: String,
) -> Result<(), String> {
    let mut data = state.lock().await;

    // Validate that editor is in AVAILABLE_EDITORS
    let is_valid = AVAILABLE_EDITORS.iter().any(|(cmd, _)| *cmd == editor);

    if !is_valid {
        return Err(format!(
            "Editor '{}' is not in available editors list",
            editor
        ));
    }

    data.settings.preferred_editor = Some(editor);
    data.update_typeslayer_config_toml().await;
    Ok(())
}

#[tauri::command]
pub async fn get_extra_tsc_flags(state: State<'_, &Mutex<AppData>>) -> Result<String, String> {
    let data = state.lock().await;
    Ok(data.settings.extra_tsc_flags.clone())
}

#[tauri::command]
pub async fn get_default_extra_tsc_flags() -> Result<String, String> {
    Ok(default_extra_tsc_flags())
}

#[tauri::command]
pub async fn set_extra_tsc_flags(
    state: State<'_, &Mutex<AppData>>,
    flags: String,
) -> Result<(), String> {
    let mut data = state.lock().await;
    data.settings.extra_tsc_flags = flags;
    data.update_typeslayer_config_toml().await;
    Ok(())
}

#[tauri::command]
pub async fn get_apply_tsc_project_flag(state: State<'_, &Mutex<AppData>>) -> Result<bool, String> {
    let data = state.lock().await;
    Ok(data.settings.apply_tsc_project_flag)
}

#[tauri::command]
pub async fn set_apply_tsc_project_flag(
    state: State<'_, &Mutex<AppData>>,
    value: bool,
) -> Result<(), String> {
    let mut data = state.lock().await;
    data.settings.apply_tsc_project_flag = value;
    data.update_typeslayer_config_toml().await;
    Ok(())
}

#[tauri::command]
pub async fn get_max_old_space_size(
    state: State<'_, &Mutex<AppData>>,
) -> Result<Option<i32>, String> {
    let data = state.lock().await;
    Ok(data.settings.max_old_space_size)
}

#[tauri::command]
pub async fn set_max_old_space_size(
    state: State<'_, &Mutex<AppData>>,
    size: Option<i32>,
) -> Result<(), String> {
    let mut data = state.lock().await;
    data.settings.max_old_space_size = size;
    data.update_typeslayer_config_toml().await;
    Ok(())
}

#[tauri::command]
pub async fn get_max_stack_size(state: State<'_, &Mutex<AppData>>) -> Result<Option<i32>, String> {
    let data = state.lock().await;
    Ok(data.settings.max_stack_size)
}

#[tauri::command]
pub async fn set_max_stack_size(
    state: State<'_, &Mutex<AppData>>,
    size: Option<i32>,
) -> Result<(), String> {
    let mut data = state.lock().await;
    data.settings.max_stack_size = size;
    data.update_typeslayer_config_toml().await;
    Ok(())
}

#[tauri::command]
pub async fn get_typescript_compiler_variant(
    state: State<'_, &Mutex<AppData>>,
) -> Result<String, String> {
    let data = state.lock().await;
    Ok(data
        .settings
        .typescript_compiler_variant
        .as_str()
        .to_string())
}

#[tauri::command]
pub async fn set_typescript_compiler_variant(
    state: State<'_, &Mutex<AppData>>,
    variant: String,
) -> Result<(), String> {
    let compiler_variant = TypeScriptCompilerVariant::from_str(&variant)
        .map_err(|_| format!("Invalid TypeScript compiler variant: {}", variant))?;

    let mut data = state.lock().await;
    data.settings.typescript_compiler_variant = compiler_variant;
    data.update_typeslayer_config_toml().await;
    Ok(())
}
