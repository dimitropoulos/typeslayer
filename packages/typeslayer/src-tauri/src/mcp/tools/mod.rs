pub mod get_depth_limits;
pub mod get_duplicate_packages;
pub mod get_hot_files;
pub mod get_hot_types;

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[doc = r" Get all tool definitions sorted by command"]
pub fn get_tool_definitions() -> Vec<Value> {
    let mut definitions: Vec<ToolDefinition<Value>> = vec![
        map_tool_definition(get_duplicate_packages::tool_definition()),
        map_tool_definition(get_hot_types::tool_definition()),
        map_tool_definition(get_hot_files::tool_definition()),
        map_tool_definition(get_depth_limits::tool_definition()),
    ];
    definitions.sort_by(|a, b| a.command.cmp(&b.command));
    definitions
        .into_iter()
        .map(|def| serde_json::to_value(def).expect("Failed to serialize tool definition"))
        .collect()
}

/// Convert a typed ToolDefinition to a Value-based ToolDefinition
fn map_tool_definition<T: Serialize>(def: ToolDefinition<T>) -> ToolDefinition<Value> {
    ToolDefinition {
        command: def.command,
        display_name: def.display_name,
        description: def.description,
        parameters: def.parameters,
        returns: serde_json::to_value(&def.returns).expect("Failed to serialize tool returns"),
    }
}

/// Represents a parameter for an MCP tool
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolParameter {
    pub name: String,
    pub optional: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<serde_json::Value>,
    pub description: String,
}

/// Represents the definition of an MCP tool with generic return type
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolDefinition<T: Serialize> {
    pub command: String,
    pub display_name: String,
    pub description: String,
    pub parameters: Vec<ToolParameter>,
    pub returns: T,
}
