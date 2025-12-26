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
pub struct EventTypeGraphFail {
    pub name: &'static str,
    pub metadata: EventMetadata,
    pub duration: u64,
    pub reason: String,
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
            duration: 3000,
            reason: "An unexpected error occurred during analysis.".to_string(),
        }
    }

    async fn create(app_data: &AppData, args: Self::Args) -> Self {
        let event = EventTypeGraphFail {
            name: EventTypeGraphFail::event_id(),
            metadata: create_event_metadata(app_data).await,
            duration: args.duration,
            reason: args.reason,
        };
        debug!("[event] [type_graph_fail] created event: {:?}", event);
        event
    }
}
