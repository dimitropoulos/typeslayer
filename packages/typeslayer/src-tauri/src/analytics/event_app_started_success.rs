use serde::Serialize;
use tracing::debug;

use crate::{
    analytics::{EventMetadata, TypeSlayerEvent, metadata::create_event_metadata},
    app_data::{AppData, settings::Settings},
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventAppStartedSuccess {
    pub name: &'static str,
    pub metadata: EventMetadata,
    pub settings: Settings,
}

impl TypeSlayerEvent for EventAppStartedSuccess {
    type Args = ();

    fn event_id() -> &'static str {
        "app_started_success"
    }

    fn description() -> &'static str {
        "the application started successfully"
    }

    fn example() -> Self {
        Self {
            name: EventAppStartedSuccess::event_id(),
            metadata: EventMetadata::example(),
            settings: Settings::default(),
        }
    }

    async fn create(app_data: &AppData, _args: Self::Args) -> Self {
        let event = EventAppStartedSuccess {
            name: EventAppStartedSuccess::event_id(),
            metadata: create_event_metadata(app_data).await,
            settings: app_data.settings.clone(),
        };
        debug!("[event] [app_started_success] create: {:?}", event);
        event
    }
}
