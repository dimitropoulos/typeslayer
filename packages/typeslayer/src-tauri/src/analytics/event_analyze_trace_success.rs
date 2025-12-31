use crate::{
    analytics::{
        TypeSlayerEvent,
        metadata::{EventMetadata, create_event_metadata},
    },
    analyze_trace::{DepthLimitKind, FileStatistics},
    app_data::AppData,
};
use serde::Serialize;
use std::collections::HashMap;
use strum::IntoEnumIterator;
use ts_rs::TS;

#[derive(Debug, Serialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct EventAnalyzeTraceSuccessData {
    #[ts(type = "number")]
    pub duration: u64,
    pub total_duplicate_packages: usize,
    pub most_duplicated_package_instances: usize,
    pub total_hotspots: usize,
    pub depth_limit_counts: HashMap<DepthLimitKind, usize>,
    pub file_statistics: FileStatistics,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct EventAnalyzeTraceSuccess {
    #[ts(type = "\"analyze_trace_success\"")]
    pub name: &'static str,
    #[serde(flatten)]
    pub metadata: EventMetadata,
    pub data: EventAnalyzeTraceSuccessData,
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
            data: EventAnalyzeTraceSuccessData {
                duration: 3000,

                total_duplicate_packages: 15,
                most_duplicated_package_instances: 8,

                total_hotspots: 20,

                depth_limit_counts: DepthLimitKind::iter().map(|kind| (kind, 0)).collect(),

                file_statistics: FileStatistics::default(),
            },
        }
    }

    async fn create(app_data: &AppData, args: Self::Args) -> Self {
        // panic if there's no app_data.analyze_trace
        let analyze_trace = app_data
            .analyze_trace
            .as_ref()
            .expect("analyze_trace must be Some to create EventAnalyzeTraceSuccess");

        EventAnalyzeTraceSuccess {
            name: EventAnalyzeTraceSuccess::event_id(),
            metadata: create_event_metadata(app_data).await,
            data: EventAnalyzeTraceSuccessData {
                duration: args.duration,

                total_duplicate_packages: analyze_trace.total_duplicate_packages(),
                most_duplicated_package_instances: analyze_trace.most_duplicated_package(),

                total_hotspots: analyze_trace.total_hotspots(),

                depth_limit_counts: analyze_trace.depth_limit_counts(),

                file_statistics: analyze_trace.file_statistics.clone(),
            },
        }
    }
}
