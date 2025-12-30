use serde::Serialize;
use ts_rs::TS;

use crate::{
    analytics::{
        TypeSlayerEvent,
        metadata::{EventMetadata, create_event_metadata},
    },
    app_data::{AppData, command::PackageManager, settings::TypeScriptCompilerVariant},
};

#[derive(Debug, Serialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct EventGenerateTraceSuccessData {
    pub duration: u64,
    pub package_manager: PackageManager,
    pub trace_count: usize,
    pub trace_json_file_size: usize,
    pub type_count: usize,
    pub types_json_file_size: usize,
    pub stdout: Option<String>,
    pub stderr: Option<String>,
    pub max_old_space_size: Option<i32>,
    pub max_stack_size: Option<i32>,
    pub tsc_extra_flags: String,
    pub typescript_compiler_variant: TypeScriptCompilerVariant,
    pub apply_tsc_project_flag: bool,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct EventGenerateTraceSuccess {
    #[ts(type = "\"generate_trace_success\"")]
    pub name: &'static str,
    #[serde(flatten)]
    pub metadata: EventMetadata,
    pub data: EventGenerateTraceSuccessData,
}

pub struct EventGenerateTraceSuccessArgs {
    pub duration: u64,
    pub stdout: Option<String>,
    pub stderr: Option<String>,
    pub trace_json_file_size: usize,
    pub types_json_file_size: usize,
}

impl TypeSlayerEvent for EventGenerateTraceSuccess {
    fn event_id() -> &'static str {
        "generate_trace_success"
    }

    fn description() -> &'static str {
        "trace generation completed successfully"
    }

    fn example() -> Self {
        Self {
            name: EventGenerateTraceSuccess::event_id(),
            metadata: EventMetadata::example(),
            data: EventGenerateTraceSuccessData {
                duration: 5000,
                package_manager: PackageManager::NPM,
                trace_json_file_size: 1024,
                trace_count: 42,
                types_json_file_size: 2048,
                type_count: 15,
                stdout: None,
                stderr: None,
                max_old_space_size: None,
                max_stack_size: None,
                tsc_extra_flags: String::new(),
                typescript_compiler_variant: TypeScriptCompilerVariant::Corsa,
                apply_tsc_project_flag: true,
            },
        }
    }

    type Args = EventGenerateTraceSuccessArgs;
    async fn create(app_data: &AppData, args: Self::Args) -> Self {
        EventGenerateTraceSuccess {
            name: EventGenerateTraceSuccess::event_id(),
            metadata: create_event_metadata(app_data).await,
            data: EventGenerateTraceSuccessData {
                duration: args.duration,
                package_manager: app_data.package_manager.clone(),
                stdout: args.stdout,
                stderr: args.stderr,
                trace_json_file_size: args.trace_json_file_size,
                trace_count: app_data.trace_json.len(),
                types_json_file_size: args.types_json_file_size,
                type_count: app_data.types_json.len(),
                max_old_space_size: app_data.settings.max_old_space_size,
                max_stack_size: app_data.settings.max_stack_size,
                tsc_extra_flags: app_data.settings.extra_tsc_flags.clone(),
                typescript_compiler_variant: app_data.settings.typescript_compiler_variant,
                apply_tsc_project_flag: app_data.settings.apply_tsc_project_flag,
            },
        }
    }
}
