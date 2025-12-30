use serde::Serialize;
use ts_rs::TS;

use crate::{
    analytics::{
        TypeSlayerEvent,
        metadata::{EventMetadata, create_event_metadata},
    },
    app_data::AppData,
};

#[derive(Debug, Serialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct EventTypeGraphFailData {
    pub duration: u64,
    pub reason: String,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct EventTypeGraphFail {
    #[ts(type = "\"type_graph_fail\"")]
    pub name: &'static str,
    #[serde(flatten)]
    pub metadata: EventMetadata,
    pub data: EventTypeGraphFailData,
}

pub struct EventTypeGraphFailArgs {
    pub duration: u64,
    pub reason: String,
}

impl TypeSlayerEvent for EventTypeGraphFail {
    type Args = EventTypeGraphFailArgs;

    fn event_id() -> &'static str {
        "type_graph_fail"
    }

    fn description() -> &'static str {
        "type-graph generation failed"
    }

    fn example() -> Self {
        Self {
            name: EventTypeGraphFail::event_id(),
            metadata: EventMetadata::example(),
            data: EventTypeGraphFailData {
                duration: 3000,
                reason: "An unexpected error occurred during analysis.".to_string(),
            },
        }
    }

    async fn create(app_data: &AppData, args: Self::Args) -> Self {
        EventTypeGraphFail {
            name: EventTypeGraphFail::event_id(),
            metadata: create_event_metadata(app_data).await,
            data: EventTypeGraphFailData {
                duration: args.duration,
                reason: args.reason,
            },
        }
    }
}
