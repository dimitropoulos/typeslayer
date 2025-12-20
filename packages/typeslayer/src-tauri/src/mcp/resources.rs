use crate::app_data::AppData;
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use tracing::info;

/// Resource definitions for outputs
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedResource {
    pub uri: String,
    pub name: String,
    pub description: Option<String>,
    pub mime_type: Option<String>,
}

/// MCP Resources - Read-only data sources for outputs
pub mod data {
    use super::*;

    pub fn get_output_resources() -> Vec<ManagedResource> {
        vec![
            ManagedResource {
                uri: "typeslayer://outputs/analyze-trace".to_string(),
                name: "analyze-trace.json".to_string(),
                description: Some(
                    "Analyzed TypeScript trace data with hotspots, duplicates, and depth limits"
                        .to_string(),
                ),
                mime_type: Some("application/json".to_string()),
            },
            ManagedResource {
                uri: "typeslayer://outputs/trace".to_string(),
                name: "trace.json".to_string(),
                description: Some("Raw TypeScript compiler trace events".to_string()),
                mime_type: Some("application/json".to_string()),
            },
            ManagedResource {
                uri: "typeslayer://outputs/types".to_string(),
                name: "types.json".to_string(),
                description: Some("TypeScript type definitions from the project".to_string()),
                mime_type: Some("application/json".to_string()),
            },
            ManagedResource {
                uri: "typeslayer://outputs/cpu-profile".to_string(),
                name: "tsc.cpuprofile".to_string(),
                description: Some(
                    "CPU profile data from TypeScript compiler execution".to_string(),
                ),
                mime_type: Some("application/json".to_string()),
            },
            ManagedResource {
                uri: "typeslayer://outputs/type-graph".to_string(),
                name: "type-graph.json".to_string(),
                description: Some("Type dependency graph and relationships".to_string()),
                mime_type: Some("application/json".to_string()),
            },
        ]
    }

    #[allow(dead_code)]
    pub async fn read_output_resource(
        uri: &str,
        app_data: &Mutex<AppData>,
    ) -> Result<String, String> {
        let data = app_data.lock().await;

        match uri {
            "typeslayer://outputs/analyze-trace" => {
                let analyze_trace = data
                    .analyze_trace
                    .as_ref()
                    .ok_or("No analyze-trace data available. Please run trace analysis first.")?;
                serde_json::to_string_pretty(analyze_trace)
                    .map_err(|e| format!("Failed to serialize analyze-trace: {e}"))
            }
            "typeslayer://outputs/trace" => {
                if data.trace_json.is_empty() {
                    Err("No trace data available.".to_string())
                } else {
                    serde_json::to_string_pretty(&data.trace_json)
                        .map_err(|e| format!("Failed to serialize trace: {e}"))
                }
            }
            "typeslayer://outputs/types" => {
                if data.types_json.is_empty() {
                    Err("No types data available.".to_string())
                } else {
                    serde_json::to_string_pretty(&data.types_json)
                        .map_err(|e| format!("Failed to serialize types: {e}"))
                }
            }
            "typeslayer://outputs/cpu-profile" => {
                let cpu_profile = data
                    .cpu_profile
                    .as_ref()
                    .ok_or("No CPU profile available. Please generate one.")?;
                serde_json::to_string_pretty(cpu_profile)
                    .map_err(|e| format!("Failed to serialize CPU profile: {e}"))
            }
            "typeslayer://outputs/type-graph" => {
                let type_graph = data
                    .type_graph
                    .as_ref()
                    .ok_or("No type graph available. Please build it first.")?;
                serde_json::to_string_pretty(type_graph)
                    .map_err(|e| format!("Failed to serialize type graph: {e}"))
            }
            _ => Err(format!("Unknown resource: {uri}")),
        }
    }
}

/// Get available resources
#[allow(dead_code)]
pub fn list_resources(_app_data: &Mutex<AppData>) -> Vec<ManagedResource> {
    info!("MCP: Listing available resources");
    data::get_output_resources()
}

/// Read a specific resource by URI
#[allow(dead_code)]
pub async fn read_resource(
    uri: &str,
    app_data: &Mutex<AppData>,
) -> Result<(String, String), String> {
    info!("MCP: Reading resource: {}", uri);
    let content = data::read_output_resource(uri, app_data).await?;
    Ok((uri.to_string(), content))
}
