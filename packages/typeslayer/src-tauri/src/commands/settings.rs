use crate::{
    analytics::{
        TypeSlayerEvent, event_analyze_trace_fail::EventAnalyzeTraceFail,
        event_analyze_trace_success::EventAnalyzeTraceSuccess,
        event_app_started_fail::EventAppStartedFail,
        event_app_started_success::EventAppStartedSuccess,
        event_generate_trace_fail::EventGenerateTraceFail,
        event_generate_trace_success::EventGenerateTraceSuccess,
        event_type_graph_fail::EventTypeGraphFail, event_type_graph_success::EventTypeGraphSuccess,
    },
    app_data::{AppData, settings::TypeScriptCompilerVariant},
    utils::{AVAILABLE_EDITORS, default_extra_tsc_flags},
};
use serde::Serialize;
use std::str::FromStr;
use tauri::State;
use tokio::sync::Mutex;
use tracing::debug;

#[tauri::command]
pub async fn get_relative_paths(state: State<'_, &Mutex<AppData>>) -> Result<bool, String> {
    let app_data = state.lock().await;
    debug!(
        "[get_relative_paths] returning {}",
        app_data.settings.relative_paths
    );
    Ok(app_data.settings.relative_paths)
}

#[tauri::command]
pub async fn set_relative_paths(
    state: State<'_, &Mutex<AppData>>,
    value: bool,
) -> Result<(), String> {
    let mut app_data = state.lock().await;
    app_data.settings.relative_paths = value;
    debug!("[set_relative_paths] set to {}", value);
    app_data.update_typeslayer_config_toml().await;
    Ok(())
}

#[tauri::command]
pub async fn get_prefer_editor_open(state: State<'_, &Mutex<AppData>>) -> Result<bool, String> {
    let app_data = state.lock().await;
    Ok(app_data.settings.prefer_editor_open)
}

#[tauri::command]
pub async fn set_prefer_editor_open(
    state: State<'_, &Mutex<AppData>>,
    value: bool,
) -> Result<(), String> {
    let mut app_data = state.lock().await;
    app_data.settings.prefer_editor_open = value;
    app_data.update_typeslayer_config_toml().await;
    Ok(())
}

#[tauri::command]
pub async fn get_preferred_editor(
    state: State<'_, &Mutex<AppData>>,
) -> Result<Option<String>, String> {
    let app_data = state.lock().await;
    Ok(app_data.settings.preferred_editor.clone())
}

#[tauri::command]
pub async fn set_preferred_editor(
    state: State<'_, &Mutex<AppData>>,
    editor: String,
) -> Result<(), String> {
    let mut app_data = state.lock().await;

    // Validate that editor is in AVAILABLE_EDITORS
    let is_valid = AVAILABLE_EDITORS.iter().any(|(cmd, _)| *cmd == editor);

    if !is_valid {
        return Err(format!(
            "Editor '{editor}' is not in available editors list",
        ));
    }

    app_data.settings.preferred_editor = Some(editor);
    app_data.update_typeslayer_config_toml().await;
    Ok(())
}

#[tauri::command]
pub async fn get_extra_tsc_flags(state: State<'_, &Mutex<AppData>>) -> Result<String, String> {
    let app_data = state.lock().await;
    Ok(app_data.settings.extra_tsc_flags.clone())
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
    let mut app_data = state.lock().await;
    app_data.settings.extra_tsc_flags = flags;
    app_data.update_typeslayer_config_toml().await;
    Ok(())
}

#[tauri::command]
pub async fn get_apply_tsc_project_flag(state: State<'_, &Mutex<AppData>>) -> Result<bool, String> {
    let app_data = state.lock().await;
    Ok(app_data.settings.apply_tsc_project_flag)
}

#[tauri::command]
pub async fn set_apply_tsc_project_flag(
    state: State<'_, &Mutex<AppData>>,
    value: bool,
) -> Result<(), String> {
    let mut app_data = state.lock().await;
    app_data.settings.apply_tsc_project_flag = value;
    app_data.update_typeslayer_config_toml().await;
    Ok(())
}

#[tauri::command]
pub async fn get_max_old_space_size(
    state: State<'_, &Mutex<AppData>>,
) -> Result<Option<i32>, String> {
    let app_data = state.lock().await;
    Ok(app_data.settings.max_old_space_size)
}

#[tauri::command]
pub async fn set_max_old_space_size(
    state: State<'_, &Mutex<AppData>>,
    size: Option<i32>,
) -> Result<(), String> {
    let mut app_data = state.lock().await;
    app_data.settings.max_old_space_size = size;
    app_data.update_typeslayer_config_toml().await;
    Ok(())
}

#[tauri::command]
pub async fn get_max_stack_size(state: State<'_, &Mutex<AppData>>) -> Result<Option<i32>, String> {
    let app_data = state.lock().await;
    Ok(app_data.settings.max_stack_size)
}

#[tauri::command]
pub async fn set_max_stack_size(
    state: State<'_, &Mutex<AppData>>,
    size: Option<i32>,
) -> Result<(), String> {
    let mut app_data = state.lock().await;
    app_data.settings.max_stack_size = size;
    app_data.update_typeslayer_config_toml().await;
    Ok(())
}

#[tauri::command]
pub async fn get_typescript_compiler_variant(
    state: State<'_, &Mutex<AppData>>,
) -> Result<String, String> {
    let app_data = state.lock().await;
    Ok(app_data
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

    let mut app_data = state.lock().await;
    app_data.settings.typescript_compiler_variant = compiler_variant;
    app_data.update_typeslayer_config_toml().await;
    Ok(())
}

#[tauri::command]
pub async fn get_max_nodes(state: State<'_, &Mutex<AppData>>) -> Result<i32, String> {
    let app_data = state.lock().await;
    Ok(app_data.settings.max_nodes)
}

#[tauri::command]
pub async fn set_max_nodes(
    state: State<'_, &Mutex<AppData>>,
    max_nodes: i32,
) -> Result<(), String> {
    if max_nodes > 10_000_000 {
        return Err("maxNodes must not exceed 10,000,000".to_string());
    }
    let mut app_data = state.lock().await;
    app_data.settings.max_nodes = max_nodes;
    app_data.update_typeslayer_config_toml().await;
    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyticsInfo {
    pub id: String,
    pub description: String,
    pub json_example: String,
    pub enabled: bool,
}

fn get_event_info<T: TypeSlayerEvent + serde::Serialize>(
    enabled_events: &[String],
) -> AnalyticsInfo {
    let event = T::example();
    let id = T::event_id().to_string();
    let description = T::description().to_string();
    let enabled = enabled_events.contains(&id);
    // if for whatever reason this fails I want it to blow up - it should never fail (it's static)
    let json_example = serde_json::to_string(&event).unwrap();
    AnalyticsInfo {
        id,
        description,
        json_example,
        enabled,
    }
}

#[tauri::command]
pub async fn get_analytics_consent(
    state: State<'_, &Mutex<AppData>>,
) -> Result<Vec<(String, AnalyticsInfo, AnalyticsInfo)>, String> {
    let app_data = state.lock().await;
    let enabled_events = &app_data.settings.analytics_consent;

    let things: Vec<(String, AnalyticsInfo, AnalyticsInfo)> = vec![
        (
            "App Started".to_string(),
            get_event_info::<EventAppStartedSuccess>(enabled_events),
            get_event_info::<EventAppStartedFail>(enabled_events),
        ),
        (
            "Generate Trace".to_string(),
            get_event_info::<EventGenerateTraceSuccess>(enabled_events),
            get_event_info::<EventGenerateTraceFail>(enabled_events),
        ),
        (
            "Analyze Trace".to_string(),
            get_event_info::<EventAnalyzeTraceSuccess>(enabled_events),
            get_event_info::<EventAnalyzeTraceFail>(enabled_events),
        ),
        (
            "Type Graph".to_string(),
            get_event_info::<EventTypeGraphSuccess>(enabled_events),
            get_event_info::<EventTypeGraphFail>(enabled_events),
        ),
    ];

    Ok(things)
}

#[tauri::command]
pub async fn set_analytics_consent(
    state: State<'_, &Mutex<AppData>>,
    event: String,
    consent: bool,
) -> Result<(), String> {
    let mut app_data = state.lock().await;
    if consent {
        if !app_data.settings.analytics_consent.contains(&event) {
            app_data.settings.analytics_consent.push(event);
        }
    } else {
        app_data.settings.analytics_consent.retain(|e| e != &event);
    }
    app_data.update_typeslayer_config_toml().await;
    Ok(())
}
