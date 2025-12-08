use crate::{
    app_data::AppData,
    mcp::tools::{ToolDefinition, ToolParameter},
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tracing::info;

pub const COMMAND: &str = "get_duplicate_packages";
pub const DESCRIPTION: &str = "Identifies duplicate packages in the node_modules tree. Duplicate packages increase bundle size and compilation time.";

/// Example return type for get_duplicate_packages tool
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetDuplicatePackagesExample {
    pub duplicates: Vec<DuplicatePackageExample>,
    pub total_duplicates: u32,
    pub total_wasted_space_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicatePackageExample {
    pub package_name: String,
    pub versions: Vec<String>,
    pub total_instances: u32,
    pub total_size_bytes: u64,
    pub paths: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicatePackageInfo {
    pub package_name: String,
    pub versions: Vec<String>,
    pub total_instances: usize,
    pub total_size_bytes: u64,
    pub paths: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetDuplicatePackagesResponse {
    pub duplicates: Vec<DuplicatePackageInfo>,
    pub total_duplicates: usize,
    pub total_wasted_space_bytes: u64,
}

pub fn tool_definition() -> ToolDefinition<GetDuplicatePackagesExample> {
    ToolDefinition {
        command: COMMAND.to_string(),
        display_name: "Get Duplicate Packages".to_string(),
        description: DESCRIPTION.to_string(),
        parameters: vec![ToolParameter {
            name: "limit".to_string(),
            optional: true,
            default: Some(serde_json::json!(50)),
            description: "Maximum number of duplicate package groups to return".to_string(),
        }],
        returns: GetDuplicatePackagesExample {
            duplicates: vec![DuplicatePackageExample {
                package_name: "lodash".to_string(),
                versions: vec!["4.17.20".to_string(), "4.17.21".to_string()],
                total_instances: 5,
                total_size_bytes: 245000,
                paths: vec![
                    "/node_modules/lodash".to_string(),
                    "/node_modules/some-dep/node_modules/lodash".to_string(),
                ],
            }],
            total_duplicates: 12,
            total_wasted_space_bytes: 1250000,
        },
    }
}

pub async fn execute(app_data: Arc<Mutex<AppData>>) -> String {
    info!("get_duplicate_packages called");

    // Lock app_data to access duplicate packages data
    let data = match app_data.lock() {
        Ok(d) => d,
        Err(e) => return format!("{{\"error\": \"Failed to lock app data: {}\"}}", e),
    };

    // Check if analyze_trace data is available
    let analyze_trace = match data.analyze_trace.as_ref() {
        Some(at) => at,
        None => {
            return r#"{"error": "No duplicate packages data available. Please run analysis first."}"#
                .to_string()
        }
    };

    // For now, use default limit - parameters can be added later
    let limit = 50;

    // Build response with limited duplicates
    let duplicates: Vec<DuplicatePackageInfo> = analyze_trace
        .duplicate_packages
        .iter()
        .take(limit)
        .map(|pkg| DuplicatePackageInfo {
            package_name: pkg.name.clone(),
            versions: pkg
                .instances
                .iter()
                .map(|inst| inst.version.clone())
                .collect(),
            total_instances: pkg.instances.len(),
            total_size_bytes: 0, // TODO: calculate from file system
            paths: pkg.instances.iter().map(|inst| inst.path.clone()).collect(),
        })
        .collect();

    let total_duplicates = analyze_trace.duplicate_packages.len();
    let total_wasted_space_bytes: u64 = 0; // TODO: calculate from file system

    let response = GetDuplicatePackagesResponse {
        duplicates,
        total_duplicates,
        total_wasted_space_bytes,
    };

    let json_response = serde_json::to_string_pretty(&response)
        .unwrap_or_else(|e| format!("{{\"error\": \"Failed to serialize response: {}\"}}", e));

    info!(
        "get_duplicate_packages returning {} duplicates (total: {})",
        response.duplicates.len(),
        response.total_duplicates
    );

    json_response
}
