use std::path::PathBuf;

use crate::{
    app_data::AppData,
    mcp::tools::{ToolDefinition, ToolParameter},
};
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use tracing::info;

pub const COMMAND: &str = "get_hot_types";
pub const DESCRIPTION: &str = "Analyzes TypeScript compilation traces to identify performance hotspots - the types that take the most time to check.";

#[derive(Debug, Serialize, Deserialize)]
pub struct HotTypeInfo {
    pub time_ms: i64,
    pub description: String,
    pub file_path: Option<PathBuf>,
    pub types_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetTypesResponse {
    pub hot_types: Vec<HotTypeInfo>,
    pub total_hot_types: usize,
}

/// Return type example for get_hot_types tool
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetTypesExample {
    pub hot_types: Vec<HotTypeExample>,
    pub total_hot_types: u32,
    pub filter_settings: HotTypeFilterSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HotTypeExample {
    pub duration_ms: f64,
    pub type_id: u32,
    pub type_display: String,
    pub file_path: String,
    pub symbol_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HotTypeFilterSettings {
    pub skip_millis: f64,
    pub force_millis: f64,
    pub limit: u32,
}

pub fn tool_definition() -> ToolDefinition<GetTypesExample> {
    ToolDefinition {
        command: COMMAND.to_string(),
        display_name: "Get Type Hot Types".to_string(),
        description: DESCRIPTION.to_string(),
        parameters: vec![
            ToolParameter {
                name: "skip_millis".to_string(),
                optional: true,
                default: Some(serde_json::json!(50)),
                description: "Minimum duration in milliseconds to include a hot type".to_string(),
            },
            ToolParameter {
                name: "force_millis".to_string(),
                optional: true,
                default: Some(serde_json::json!(500)),
                description: "Force inclusion of hot types above this duration".to_string(),
            },
            ToolParameter {
                name: "limit".to_string(),
                optional: true,
                default: Some(serde_json::json!(100)),
                description: "Maximum number of hot types to return".to_string(),
            },
        ],
        returns: GetTypesExample {
            hot_types: vec![HotTypeExample {
                duration_ms: 1250.5,
                type_id: 12345,
                type_display: "Promise<User[]>".to_string(),
                file_path: "/src/models/user.ts".to_string(),
                symbol_name: "getUserList".to_string(),
            }],
            total_hot_types: 156,
            filter_settings: HotTypeFilterSettings {
                skip_millis: 50.0,
                force_millis: 500.0,
                limit: 100,
            },
        },
    }
}

pub async fn execute(app_data: &Mutex<AppData>) -> String {
    info!("[get_hot_types] called");

    // Lock app_data to access analyze_trace
    let data = app_data.lock().await;

    // Check if analyze-trace data is available
    let analyze_trace = match data.analyze_trace.as_ref() {
        Some(at) => at,
        None => {
            return r#"{"error": "No analyze-trace data available. Please run trace analysis first."}"#
                .to_string()
        }
    };

    // For now, use default limits - parameters can be added later
    let limit = 100;

    // Filter and limit hotspots
    let mut hot_types = analyze_trace.hot_spots.clone();
    hot_types.truncate(limit);

    // Build response
    let response = GetTypesResponse {
        hot_types: hot_types
            .iter()
            .map(|h| HotTypeInfo {
                time_ms: h.time_ms,
                description: h.description.clone(),
                file_path: h.path.clone(),
                types_count: h.types.as_ref().map(|t| t.len()).unwrap_or(0),
            })
            .collect(),
        total_hot_types: analyze_trace.hot_spots.len(),
    };

    let json_response = serde_json::to_string_pretty(&response)
        .unwrap_or_else(|e| format!("{{\"error\": \"Failed to serialize response: {}\"}}", e));

    info!(
        "[get_hot_types] returning {} hotspots (total: {})",
        response.hot_types.len(),
        response.total_hot_types
    );

    json_response
}
