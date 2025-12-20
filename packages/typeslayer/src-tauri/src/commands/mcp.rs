use crate::mcp::status::{McpStatusTracker, ToolStatus};

/// Tauri command to get the status of running MCP tools
#[tauri::command]
pub async fn get_mcp_running_tools<'a>(
    state: tauri::State<'a, McpStatusTracker>,
) -> Result<Vec<ToolStatus>, String> {
    Ok(state.get_running_tools().await)
}

/// Tauri command to get available MCP tool definitions
#[tauri::command]
pub fn get_available_mcp_tools() -> Vec<serde_json::Value> {
    crate::mcp::tools::get_tool_definitions()
}

/// Tauri command to get available MCP resources
#[tauri::command]
pub fn get_available_mcp_resources() -> Vec<crate::mcp::resources::ManagedResource> {
    crate::mcp::resources::data::get_output_resources()
}
