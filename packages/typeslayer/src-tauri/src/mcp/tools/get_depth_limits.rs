use crate::{
    analyze_trace::DepthLimitKind,
    app_data::AppData,
    mcp::tools::{ToolDefinition, ToolParameter},
};
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use tracing::info;

pub const COMMAND: &str = "get_depth_limits";
pub const DESCRIPTION: &str = "Returns depth limit events grouped by category (e.g., instantiateType_DepthLimit, checkTypeRelatedTo_DepthLimit). These are TypeScript compiler internal limits hit during type checking.";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DepthLimitCategory {
    pub category: DepthLimitKind,
    pub count: usize,
    pub events: Vec<DepthLimitEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DepthLimitEvent {
    pub timestamp: f64,
    pub args: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GetDepthLimitsResponse {
    pub categories: Vec<DepthLimitCategory>,
    pub total_events: usize,
}

/// Return type example for get_depth_limits tool
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetDepthLimitsExample {
    pub categories: Vec<DepthLimitCategory>,
    pub total_events: u32,
}

pub fn tool_definition() -> ToolDefinition<GetDepthLimitsExample> {
    ToolDefinition {
        command: COMMAND.to_string(),
        display_name: "Get Depth Limits".to_string(),
        description: DESCRIPTION.to_string(),
        parameters: vec![ToolParameter {
            name: "limit".to_string(),
            optional: true,
            default: Some(serde_json::json!(10)),
            description: "Maximum number of events per category to return".to_string(),
        }],
        returns: GetDepthLimitsExample {
            categories: vec![DepthLimitCategory {
                category: DepthLimitKind::InstantiateType,
                count: 3,
                events: vec![DepthLimitEvent {
                    timestamp: 123456.789,
                    args: serde_json::json!({"instantiationDepth": 50}),
                }],
            }],
            total_events: 3,
        },
    }
}

pub async fn execute(app_data: &Mutex<AppData>) -> String {
    info!("[get_depth_limits] called");

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

    let limit = 10usize; // stub parameter, matches tool definition default

    let mut total_events = 0;
    let mut categories: Vec<DepthLimitCategory> = analyze_trace
        .depth_limits
        .iter()
        .map(|(category, events)| {
            total_events += events.len();
            let limited_events: Vec<DepthLimitEvent> = events
                .iter()
                .take(limit)
                .map(|ev| DepthLimitEvent {
                    timestamp: ev.ts,
                    args: ev.args.clone(),
                })
                .collect();

            DepthLimitCategory {
                category: category.clone(),
                count: events.len(),
                events: limited_events,
            }
        })
        .collect();

    // Sort categories by event count (desc) for relevance
    categories.sort_by(|a, b| b.count.cmp(&a.count));

    let response = GetDepthLimitsResponse {
        categories,
        total_events,
    };

    match serde_json::to_string_pretty(&response) {
        Ok(json) => json,
        Err(e) => format!("{{\"error\": \"Failed to serialize response: {}\"}}", e),
    }
}
