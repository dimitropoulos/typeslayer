use crate::{
    analytics::{EventMetadata, TypeSlayerEvent, metadata::create_event_metadata},
    app_data::{AppData, settings::Settings},
    layercake::SourceHistory,
};
use serde::Serialize;
use std::path::PathBuf;
use ts_rs::TS;

#[derive(Debug, Serialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct EventAppStartedSuccessData {
    pub settings: Settings,
    pub source_history: SourceHistory,
    pub project_root: PathBuf,
}

#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EventAppStartedSuccess {
    #[ts(type = "\"app_started_success\"")]
    pub name: &'static str,
    #[serde(flatten)]
    pub metadata: EventMetadata,
    pub data: EventAppStartedSuccessData,
}

#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EventAppStartedSuccessArgs {}

impl TypeSlayerEvent for EventAppStartedSuccess {
    type Args = EventAppStartedSuccessArgs;

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
                project_root: PathBuf::from("/path/to/project"),
            },
        }
    }

    async fn create(app_data: &AppData, _args: Self::Args) -> Self {
        EventAppStartedSuccess {
            name: EventAppStartedSuccess::event_id(),
            metadata: create_event_metadata(app_data).await,
            data: EventAppStartedSuccessData {
                settings: app_data.settings.clone(),
                source_history: app_data.cake.source_history.clone(),
                project_root: app_data.project_root.clone(),
            },
        }
    }
}
