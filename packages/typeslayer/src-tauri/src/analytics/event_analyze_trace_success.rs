use crate::{
    analytics::{
        TypeSlayerEvent,
        metadata::{EventMetadata, create_event_metadata},
    },
    analyze_trace::DepthLimitKind,
    app_data::AppData,
};
use serde::Serialize;
use std::collections::HashMap;
use strum::IntoEnumIterator;
use tracing::debug;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventAnalyzeTraceSuccess {
    pub name: &'static str,
    pub metadata: EventMetadata,
    pub duration: u64,

    pub total_duplicate_packages: usize,
    pub most_duplicated_package_instances: usize,

    pub total_hotspots: usize,

    pub depth_limit_counts: HashMap<DepthLimitKind, usize>,
}

pub struct EventAnalyzeTraceSuccessArgs {
    pub duration: u64,
}

impl TypeSlayerEvent for EventAnalyzeTraceSuccess {
    type Args = EventAnalyzeTraceSuccessArgs;

    fn event_id() -> &'static str {
        "analyze_trace_success"
    }

    fn description() -> &'static str {
        "analyze-trace completed successfully"
    }

    fn example() -> Self {
        Self {
            name: EventAnalyzeTraceSuccess::event_id(),
            metadata: EventMetadata::example(),
            duration: 3000,

            total_duplicate_packages: 15,
            most_duplicated_package_instances: 8,

            total_hotspots: 20,

            depth_limit_counts: DepthLimitKind::iter().map(|kind| (kind, 0)).collect(),
        }
    }

    async fn create(app_data: &AppData, args: Self::Args) -> Self {
        // panic if there's no app_data.analyze_trace
        let analyze_trace = app_data
            .analyze_trace
            .as_ref()
            .expect("analyze_trace must be Some to create EventAnalyzeTraceSuccess");

        let event = EventAnalyzeTraceSuccess {
            name: EventAnalyzeTraceSuccess::event_id(),
            metadata: create_event_metadata(app_data).await,
            duration: args.duration,

            total_duplicate_packages: analyze_trace.total_duplicate_packages(),
            most_duplicated_package_instances: analyze_trace.most_duplicated_package(),

            total_hotspots: analyze_trace.total_hotspots(),

            depth_limit_counts: analyze_trace.depth_limit_counts(),
        };
        debug!("[event] [analyze_trace_success] created event: {:?}", event);
        event
    }
}
