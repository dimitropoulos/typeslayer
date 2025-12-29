use serde::Serialize;
use tracing::debug;
use ts_rs::TS;

use crate::{
    analytics::{EventMetadata, TypeSlayerEvent, metadata::create_event_metadata},
    app_data::{AppData, settings::Settings},
    layercake::SourceHistory,
};

#[derive(Debug, Serialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct EventAppStartedSuccessData {
    pub settings: Settings,
    pub source_history: SourceHistory,
}

#[derive(Debug, Serialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct EventAppStartedSuccess {
    #[ts(type = "\"app_started_success\"")]
    pub name: &'static str,
    #[serde(flatten)]
    pub metadata: EventMetadata,
    pub data: EventAppStartedSuccessData,
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
            data: EventAppStartedSuccessData {
                settings: Settings::default(),
                source_history: SourceHistory::default(),
            },
        }
    }

    async fn create(app_data: &AppData, _args: Self::Args) -> Self {
        let event = EventAppStartedSuccess {
            name: EventAppStartedSuccess::event_id(),
            metadata: create_event_metadata(app_data).await,
            data: EventAppStartedSuccessData {
                settings: app_data.settings.clone(),
                source_history: app_data.cake.source_history.clone(),
            },
        };
        debug!("[event] [app_started_success] create: {:?}", event);
        event
    }
}
