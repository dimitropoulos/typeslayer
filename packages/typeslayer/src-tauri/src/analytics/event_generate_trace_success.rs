use serde::Serialize;
use tracing::debug;

use crate::{
    analytics::{
        TypeSlayerEvent,
        metadata::{EventMetadata, create_event_metadata},
    },
    app_data::{AppData, command::PackageManager, settings::TypeScriptCompilerVariant},
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventGenerateTraceSuccess {
    pub name: &'static str,
    pub metadata: EventMetadata,
    pub duration: u64,
    pub package_manager: PackageManager,
    pub traces_count: usize,
    pub trace_json_file_size: usize,
    pub types_count: usize,
    pub types_json_file_size: usize,
    pub stdout: Option<String>,
    pub stderr: Option<String>,
    pub max_old_space_size: Option<i32>,
    pub max_stack_size: Option<i32>,
    pub tsc_extra_flags: String,
    pub typescript_compiler_variant: TypeScriptCompilerVariant,
    pub apply_tsc_project_flag: bool,
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
            duration: 5000,
            package_manager: PackageManager::NPM,
            trace_json_file_size: 1024,
            traces_count: 42,
            types_json_file_size: 2048,
            types_count: 15,
            stdout: None,
            stderr: None,
            max_old_space_size: None,
            max_stack_size: None,
            tsc_extra_flags: String::new(),
            typescript_compiler_variant: TypeScriptCompilerVariant::Corsa,
            apply_tsc_project_flag: true,
        }
    }

    type Args = EventGenerateTraceSuccessArgs;
    async fn create(app_data: &AppData, args: Self::Args) -> Self {
        let event = EventGenerateTraceSuccess {
            name: EventGenerateTraceSuccess::event_id(),
            metadata: create_event_metadata(app_data).await,
            duration: args.duration,
            package_manager: app_data.package_manager.clone(),
            stdout: args.stdout,
            stderr: args.stderr,
            trace_json_file_size: args.trace_json_file_size,
            traces_count: app_data.trace_json.len(),
            types_json_file_size: args.types_json_file_size,
            types_count: app_data.types_json.len(),
            max_old_space_size: app_data.settings.max_old_space_size,
            max_stack_size: app_data.settings.max_stack_size,
            tsc_extra_flags: app_data.settings.extra_tsc_flags.clone(),
            typescript_compiler_variant: app_data.settings.typescript_compiler_variant,
            apply_tsc_project_flag: app_data.settings.apply_tsc_project_flag,
        };
        debug!("[event] [generate_trace_success] create: {:?}", event);
        event
    }
}
