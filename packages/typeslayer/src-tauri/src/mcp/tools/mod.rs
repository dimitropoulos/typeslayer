pub mod get_depth_limits;
pub mod get_duplicate_packages;
pub mod get_hot_files;
pub mod get_hot_types;

use crate::app_data::AppData;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::{Arc, Mutex};

/// Macro to register all tools - just add tool modules here
macro_rules! register_tools {
    ($($module:ident),* $(,)?) => {
        /// Get all tool definitions sorted by command
        pub fn get_tool_definitions() -> Vec<Value> {
            let mut definitions: Vec<ToolDefinition<Value>> = vec![
                $(map_tool_definition($module::tool_definition()),)*
            ];

            // Sort by command for consistent ordering
            definitions.sort_by(|a, b| a.command.cmp(&b.command));

            // Serialize each definition to JSON
            definitions
                .into_iter()
                .map(|def| serde_json::to_value(def).expect("Failed to serialize tool definition"))
                .collect()
        }

        /// Execute a tool by name
        #[allow(dead_code)]
        pub async fn execute_tool(tool_name: &str, app_data: Arc<Mutex<AppData>>) -> Option<String> {
            match tool_name {
                $($module::COMMAND => Some($module::execute(app_data).await),)*
                _ => None,
            }
        }
    };
}

// Register all tools here - adding a new tool just requires adding its module name
register_tools!(
    get_duplicate_packages,
    get_hot_types,
    get_hot_files,
    get_depth_limits
);

/// Macro to implement tool methods on the MCP server
/// Usage: impl_tools!(ServerType => module1, module2, ...)
/// Automatically wraps tool execution with status tracking
#[macro_export]
macro_rules! impl_tools {
    ($server_type:ty => $($module:ident),* $(,)?) => {
        #[rmcp::tool(tool_box)]
        impl $server_type {
            $(
                #[doc = concat!("Execute the ", stringify!($module), " tool")]
                #[rmcp::tool(description = $crate::mcp::tools::$module::DESCRIPTION)]
                async fn $module(&self) -> String {
                    let command = $crate::mcp::tools::$module::COMMAND;
                    self.status.start_tool(command);
                    let result = $crate::mcp::tools::$module::execute(std::sync::Arc::clone(&self.app_data)).await;
                    self.status.end_tool(command);
                    result
                }
            )*
        }
    };
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
