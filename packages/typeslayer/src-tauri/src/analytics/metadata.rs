use serde::Serialize;
use ts_rs::TS;

use crate::{
    app_data::{AppData, AppMode},
    utils::get_platform,
};

#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EventMetadata {
    pub session_id: String,
    #[ts(type = "number")]
    pub timestamp: u64,
    pub version: String,
    pub platform: String,
    pub mode: AppMode,
}

pub async fn create_event_metadata(app_data: &AppData) -> EventMetadata {
    EventMetadata {
        session_id: app_data.session_id.clone(),
        timestamp: chrono::Utc::now().timestamp_millis() as u64,
        version: app_data.version.clone(),
        platform: app_data.platform.clone(),
        mode: app_data.mode.clone(),
    }
}

impl EventMetadata {
    pub fn example() -> Self {
        Self {
            session_id: "n9ZiLt01d".to_string(),
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
            version: "0.1.0".to_string(),
            platform: get_platform(),
            mode: AppMode::GUI,
        }
    }
}
