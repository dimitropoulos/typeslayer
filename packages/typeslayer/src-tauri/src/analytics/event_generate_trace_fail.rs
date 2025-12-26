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
pub struct EventGenerateTraceFail {
    pub name: &'static str,
    pub metadata: EventMetadata,
    pub duration: u64,
    pub package_manager: PackageManager,
    pub stdout: Option<String>,
    pub stderr: Option<String>,
    pub max_old_space_size: Option<i32>,
    pub max_stack_size: Option<i32>,
    pub tsc_extra_flags: String,
    pub typescript_compiler_variant: TypeScriptCompilerVariant,
    pub apply_tsc_project_flag: bool,
}

pub struct EventGenerateTraceFailArgs {
    pub duration: u64,
    pub stdout: Option<String>,
    pub stderr: Option<String>,
}

impl TypeSlayerEvent for EventGenerateTraceFail {
    fn event_id() -> &'static str {
        "generate_trace_fail"
    }

    fn description() -> &'static str {
        "trace generation failed"
    }

    fn example() -> Self {
        Self {
            name: EventGenerateTraceFail::event_id(),
            metadata: EventMetadata::example(),
            duration: 5000,
            package_manager: PackageManager::NPM,
            stdout: None,
            stderr: None,
            max_old_space_size: None,
            max_stack_size: None,
            tsc_extra_flags: String::new(),
            typescript_compiler_variant: TypeScriptCompilerVariant::Corsa,
            apply_tsc_project_flag: true,
        }
    }

    type Args = EventGenerateTraceFailArgs;
    async fn create(app_data: &AppData, args: Self::Args) -> Self {
        let event = EventGenerateTraceFail {
            name: EventGenerateTraceFail::event_id(),
            metadata: create_event_metadata(app_data).await,
            duration: args.duration,
            package_manager: app_data.package_manager.clone(),
            stdout: args.stdout,
            stderr: args.stderr,
            max_old_space_size: app_data.settings.max_old_space_size,
            max_stack_size: app_data.settings.max_stack_size,
            tsc_extra_flags: app_data.settings.extra_tsc_flags.clone(),
            typescript_compiler_variant: app_data.settings.typescript_compiler_variant,
            apply_tsc_project_flag: app_data.settings.apply_tsc_project_flag,
        };
        debug!("[generate_trace_event_fail] create: {:?}", event);
        event
    }
}
