use crate::{
    analytics::{EventMetadata, TypeSlayerEvent, metadata::create_event_metadata},
    app_data::AppData,
};
use serde::Serialize;
use std::path::PathBuf;
use ts_rs::TS;

#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EventAppStartedFailData {
    pub reason: String,
    pub project_root: PathBuf,
}

#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
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
                project_root: PathBuf::from("/path/to/project"),
            },
        }
    }

    async fn create(app_data: &AppData, args: Self::Args) -> Self {
        EventAppStartedFail {
            name: EventAppStartedFail::event_id(),
            metadata: create_event_metadata(app_data).await,
            data: EventAppStartedFailData {
                reason: args.reason,
                project_root: app_data.project_root.clone(),
            },
        }
    }
}
