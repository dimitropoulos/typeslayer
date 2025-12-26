use serde::{Deserialize, Serialize};
use strum_macros::EnumString;

use crate::analytics::{
    TypeSlayerEvent, event_analyze_trace_fail::EventAnalyzeTraceFail,
    event_analyze_trace_success::EventAnalyzeTraceSuccess,
    event_app_started_fail::EventAppStartedFail, event_app_started_success::EventAppStartedSuccess,
    event_generate_trace_fail::EventGenerateTraceFail,
    event_generate_trace_success::EventGenerateTraceSuccess,
    event_type_graph_fail::EventTypeGraphFail, event_type_graph_success::EventTypeGraphSuccess,
};

#[derive(Clone, Copy, Default, Debug, Serialize, Deserialize, EnumString)]
pub enum TypeScriptCompilerVariant {
    #[serde(rename = "tsc")]
    #[strum(serialize = "tsc")]
    #[default]
    Strata,
    #[serde(rename = "vue-tsc")]
    #[strum(serialize = "vue-tsc")]
    Vue,
    #[serde(rename = "tsgo")]
    #[strum(serialize = "tsgo")]
    Corsa,
}

impl TypeScriptCompilerVariant {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Strata => "tsc",
            Self::Vue => "vue-tsc",
            Self::Corsa => "tsgo",
        }
    }

    pub fn npm_package(&self) -> &'static str {
        match self {
            Self::Strata => "typescript",
            Self::Vue => "vue-tsc",
            Self::Corsa => "@typescript/native-preview",
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub relative_paths: bool,
    pub prefer_editor_open: bool,
    pub preferred_editor: Option<String>,
    pub extra_tsc_flags: String,
    pub apply_tsc_project_flag: bool,
    pub max_old_space_size: Option<i32>,
    pub max_stack_size: Option<i32>,
    pub typescript_compiler_variant: TypeScriptCompilerVariant,
    pub max_nodes: i32,
    pub analytics_consent: Vec<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            relative_paths: true,
            prefer_editor_open: true,
            preferred_editor: Some("code".to_string()),
            extra_tsc_flags: "--noEmit --incremental false --noErrorTruncation".to_string(),
            apply_tsc_project_flag: true,
            max_old_space_size: None,
            max_stack_size: None,
            typescript_compiler_variant: TypeScriptCompilerVariant::default(),
            max_nodes: 3_000_000,
            analytics_consent: vec![
                EventAppStartedFail::event_id().to_string(),
                EventAppStartedSuccess::event_id().to_string(),
                EventGenerateTraceFail::event_id().to_string(),
                EventGenerateTraceSuccess::event_id().to_string(),
                EventAnalyzeTraceFail::event_id().to_string(),
                EventAnalyzeTraceSuccess::event_id().to_string(),
                EventTypeGraphFail::event_id().to_string(),
                EventTypeGraphSuccess::event_id().to_string(),
            ],
        }
    }
}
