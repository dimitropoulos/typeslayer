use crate::{
    app_data::AppData,
    mcp::tools::{ToolDefinition, ToolParameter},
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tracing::info;

pub const COMMAND: &str = "get_hot_files";
pub const DESCRIPTION: &str = "Returns the files that took the longest to compile, based on the trace data used by the treemap.";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HotFileInfo {
    pub path: String,
    pub duration_ms: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GetHotFilesResponse {
    pub files: Vec<HotFileInfo>,
    pub total_files: usize,
}

/// Return type example for get_hot_files tool
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetHotFilesExample {
    pub files: Vec<HotFileInfo>,
    pub total_files: u32,
}

pub fn tool_definition() -> ToolDefinition<GetHotFilesExample> {
    ToolDefinition {
        command: COMMAND.to_string(),
        display_name: "Get Hot Files".to_string(),
        description: DESCRIPTION.to_string(),
        parameters: vec![ToolParameter {
            name: "limit".to_string(),
            optional: true,
            default: Some(serde_json::json!(10)),
            description: "Maximum number of hottest files to return".to_string(),
        }],
        returns: GetHotFilesExample {
            files: vec![HotFileInfo {
                path: "src/example.ts".to_string(),
                duration_ms: 1234.5,
            }],
            total_files: 1,
        },
    }
}

pub async fn execute(app_data: Arc<Mutex<AppData>>) -> String {
    info!("get_hot_files called");

    // Lock app_data to access trace data
    let data = match app_data.lock() {
        Ok(d) => d,
        Err(e) => return format!("{{\"error\": \"Failed to lock app data: {}\"}}", e),
    };

    if data.trace_json.is_empty() {
        return r#"{"error": "No trace data available. Please generate a trace first."}"#
            .to_string();
    }

    // Build treemap data (already sorted desc by duration)
    let treemap_nodes = match crate::treemap::build_treemap_from_trace(&data.trace_json) {
        Ok(nodes) => nodes,
        Err(e) => return format!("{{\"error\": \"Failed to build treemap data: {}\"}}", e),
    };

    let limit = 10usize; // keep stubbed for now; matches tool definition default

    let mut files: Vec<HotFileInfo> = treemap_nodes
        .into_iter()
        .take(limit)
        .map(|node| HotFileInfo {
            path: node.path.unwrap_or_else(|| node.name.clone()),
            duration_ms: node.value,
        })
        .collect();

    // Ensure stable descending order (treemap already sorted, but be explicit)
    files.sort_by(|a, b| {
        b.duration_ms
            .partial_cmp(&a.duration_ms)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    let response = GetHotFilesResponse {
        total_files: files.len(),
        files,
    };

    match serde_json::to_string_pretty(&response) {
        Ok(json) => json,
        Err(e) => format!("{{\"error\": \"Failed to serialize response: {}\"}}", e),
    }
}
