use serde::Serialize;
use tracing::debug;

use crate::{
    analytics::{EventMetadata, TypeSlayerEvent, metadata::create_event_metadata},
    app_data::AppData,
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventAppStartedFail {
    pub name: &'static str,
    pub metadata: EventMetadata,
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
        }
    }

    async fn create(app_data: &AppData, _args: Self::Args) -> Self {
        let event = EventAppStartedFail {
            name: EventAppStartedFail::event_id(),
            metadata: create_event_metadata(app_data).await,
        };
        debug!("[event] [app_started_fail] create: {:?}", event);
        event
    }
}
