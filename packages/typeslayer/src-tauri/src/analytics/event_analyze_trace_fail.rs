use serde::Serialize;
use tracing::debug;

use crate::{
    analytics::{
        TypeSlayerEvent,
        metadata::{EventMetadata, create_event_metadata},
    },
    app_data::AppData,
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventAnalyzeTraceFailData {
    pub duration: u64,
    pub reason: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventAnalyzeTraceFail {
    pub name: &'static str,
    #[serde(flatten)]
    pub metadata: EventMetadata,
    pub data: EventAnalyzeTraceFailData,
}

pub struct EventAnalyzeTraceFailArgs {
    pub duration: u64,
    pub reason: String,
}

impl TypeSlayerEvent for EventAnalyzeTraceFail {
    type Args = EventAnalyzeTraceFailArgs;

    fn event_id() -> &'static str {
        "analyze_trace_fail"
    }

    fn description() -> &'static str {
        "analyze-trace generation failed"
    }

    fn example() -> Self {
        Self {
            name: EventAnalyzeTraceFail::event_id(),
            metadata: EventMetadata::example(),
            data: EventAnalyzeTraceFailData {
                duration: 3000,
                reason: "An unexpected error occurred during analysis.".to_string(),
            },
        }
    }

    async fn create(app_data: &AppData, args: Self::Args) -> Self {
        let event = EventAnalyzeTraceFail {
            name: EventAnalyzeTraceFail::event_id(),
            metadata: create_event_metadata(app_data).await,
            data: EventAnalyzeTraceFailData {
                duration: args.duration,
                reason: args.reason,
            },
        };
        debug!("[event] [analyze_trace_fail] created event: {:?}", event);
        event
    }
}
