pub mod event_analyze_trace_fail;
pub mod event_analyze_trace_success;
pub mod event_app_started_fail;
pub mod event_app_started_success;
pub mod event_generate_trace_fail;
pub mod event_generate_trace_success;
pub mod event_type_graph_fail;
pub mod event_type_graph_success;
pub mod metadata;

use crate::{analytics::metadata::EventMetadata, app_data::AppData};
use tracing::debug;

const ANALYTICS_EVENTS_FILENAME: &str = "events.ndjson";

pub trait TypeSlayerEvent: Sized + serde::Serialize + std::fmt::Debug + Send + 'static {
    type Args;

    fn event_id() -> &'static str;
    fn example() -> Self;
    fn description() -> &'static str;
    async fn create(app_data: &AppData, args: Self::Args) -> Self;
    async fn send(app_data: &AppData, args: Self::Args) {
        if !app_data
            .settings
            .analytics_consent
            .iter()
            .any(|id| id == Self::event_id())
        {
            debug!("[analytics] skipping {} (no consent)", Self::event_id());
            return;
        }
        let event = Self::create(app_data, args).await;

        let logs_location = app_data.data_dir.join(ANALYTICS_EVENTS_FILENAME);
        {
            use std::io::Write;
            let mut file = std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&logs_location)
                .expect("failed to open analytics logs file");
            let json = serde_json::to_string(&event).expect("failed to serialize analytics event");
            writeln!(file, "{}", json).expect("failed to write analytics event to logs file");
        }

        send_event::<Self>(event);
    }
}

pub fn send_event<T: TypeSlayerEvent + serde::Serialize + std::fmt::Debug + Send + 'static>(
    event: T,
) {
    debug!("[analytics] sending event: {:?}", event);
    tauri::async_runtime::spawn(async move {
        let client = reqwest::Client::new();
        let res = client
            .post("https://analytics.typeslayer.dev/collect")
            .json(&event)
            .send()
            .await;

        match res {
            Ok(response) => {
                if !response.status().is_success() {
                    eprintln!(
                        "Failed to send analytics event '{}': HTTP {}",
                        T::event_id(),
                        response.status()
                    );
                }
            }
            Err(e) => {
                eprintln!("Failed to send analytics event '{}': {}", T::event_id(), e);
            }
        }
    });
}

/*

todo:
- events for uploading
- update docs
- app start should note whether it loaded things from disk

*/
