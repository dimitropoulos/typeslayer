use serde::Serialize;
use tracing::debug;
use ts_rs::TS;

use crate::{
    analytics::{EventMetadata, TypeSlayerEvent, metadata::create_event_metadata},
    app_data::AppData,
};

#[derive(Debug, Serialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct EventAppStartedFailData {
    pub reason: String,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct EventAppStartedFail {
    #[ts(type = "\"app_started_fail\"")]
    pub name: &'static str,
    #[serde(flatten)]
    pub metadata: EventMetadata,
    pub data: EventAppStartedFailData,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventAppStartedFailArgs {
    pub reason: String,
}

impl TypeSlayerEvent for EventAppStartedFail {
    type Args = EventAppStartedFailArgs;

    fn event_id() -> &'static str {
        "app_started_fail"
    }

    fn description() -> &'static str {
        "the application failed to start"
    }

    fn example() -> Self {
        Self {
            name: EventAppStartedFail::event_id(),
            metadata: EventMetadata::example(),
            data: EventAppStartedFailData {
                reason: "unknown".to_string(),
            },
        }
    }

    async fn create(app_data: &AppData, args: Self::Args) -> Self {
        let event = EventAppStartedFail {
            name: EventAppStartedFail::event_id(),
            metadata: create_event_metadata(app_data).await,
            data: EventAppStartedFailData {
                reason: args.reason,
            },
        };
        debug!("[event] [app_started_fail] create: {:?}", event);
        event
    }
}
