use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tracing::info;

/// Represents the execution state of an MCP tool
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ToolStatus {
    /// Tool is currently executing
    Running,
    /// Tool has completed successfully
    Success,
    /// Tool execution resulted in an error
    Error,
    /// Tool execution was cancelled
    Cancelled,
}

/// Represents the progress of a specific MCP tool
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolProgress {
    /// Name of the tool
    pub tool_name: String,
    /// Current status of the tool
    pub status: ToolStatus,
    /// Progress percentage (0-100)
    pub progress: u8,
    /// Optional message with details about the current operation
    pub message: Option<String>,
    /// Timestamp when the tool started execution
    pub started_at: u64,
}

/// Global MCP status tracker
#[derive(Clone)]
pub struct McpStatusTracker {
    // Map of tool_name -> ToolProgress
    tools: Arc<Mutex<HashMap<String, ToolProgress>>>,
}

impl McpStatusTracker {
    /// Create a new MCP status tracker
    pub fn new() -> Self {
        Self {
            tools: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Start tracking a tool execution
    pub fn start_tool(&self, tool_name: impl Into<String>) {
        let tool_name = tool_name.into();
        info!("MCP tool started: {}", tool_name);

        if let Ok(mut tools) = self.tools.lock() {
            tools.insert(
                tool_name.clone(),
                ToolProgress {
                    tool_name,
                    status: ToolStatus::Running,
                    progress: 0,
                    message: None,
                    started_at: std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .map(|d| d.as_secs())
                        .unwrap_or(0),
                },
            );
        }
    }

    /// Update tool progress
    pub fn update_tool(&self, tool_name: &str, progress: u8, message: Option<String>) {
        if let Ok(mut tools) = self.tools.lock() {
            if let Some(tool) = tools.get_mut(tool_name) {
                tool.progress = progress.min(100);
                tool.message = message;
                info!("MCP tool progress: {} - {}%", tool_name, tool.progress);
            }
        }
    }

    /// Mark a tool as completed successfully
    pub fn complete_tool(&self, tool_name: &str) {
        if let Ok(mut tools) = self.tools.lock() {
            if let Some(tool) = tools.get_mut(tool_name) {
                tool.status = ToolStatus::Success;
                tool.progress = 100;
                info!("MCP tool completed: {}", tool_name);
            }
        }
    }

    /// Mark a tool as failed
    pub fn fail_tool(&self, tool_name: &str, error_message: impl Into<String>) {
        let error_message = error_message.into();
        info!("MCP tool failed: {} - {}", tool_name, error_message);

        if let Ok(mut tools) = self.tools.lock() {
            if let Some(tool) = tools.get_mut(tool_name) {
                tool.status = ToolStatus::Error;
                tool.message = Some(error_message);
            }
        }
    }

    /// Get the status of a specific tool
    pub fn get_tool_status(&self, tool_name: &str) -> Option<ToolProgress> {
        self.tools
            .lock()
            .ok()
            .and_then(|tools| tools.get(tool_name).cloned())
    }

    /// Get all currently active tools (running or in progress)
    pub fn get_active_tools(&self) -> Vec<ToolProgress> {
        self.tools
            .lock()
            .ok()
            .map(|tools| {
                tools
                    .values()
                    .filter(|tool| tool.status == ToolStatus::Running)
                    .cloned()
                    .collect()
            })
            .unwrap_or_default()
    }

    /// Get all tool statuses
    pub fn get_all_tools(&self) -> Vec<ToolProgress> {
        self.tools
            .lock()
            .ok()
            .map(|tools| tools.values().cloned().collect())
            .unwrap_or_default()
    }

    /// Clear all tool statuses
    pub fn clear_all(&self) {
        if let Ok(mut tools) = self.tools.lock() {
            tools.clear();
        }
    }

    /// Clear a specific tool status
    pub fn clear_tool(&self, tool_name: &str) {
        if let Ok(mut tools) = self.tools.lock() {
            tools.remove(tool_name);
        }
    }
}

impl Default for McpStatusTracker {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tool_lifecycle() {
        let tracker = McpStatusTracker::new();

        // Start a tool
        tracker.start_tool("get_hotspots");
        assert_eq!(tracker.get_active_tools().len(), 1);

        // Update progress
        tracker.update_tool("get_hotspots", 50, Some("Processing hotspots".to_string()));
        let tool = tracker.get_tool_status("get_hotspots").unwrap();
        assert_eq!(tool.progress, 50);
        assert_eq!(tool.status, ToolStatus::Running);

        // Complete the tool
        tracker.complete_tool("get_hotspots");
        let tool = tracker.get_tool_status("get_hotspots").unwrap();
        assert_eq!(tool.status, ToolStatus::Success);
        assert_eq!(tool.progress, 100);
        assert_eq!(tracker.get_active_tools().len(), 0);
    }

    #[test]
    fn test_tool_failure() {
        let tracker = McpStatusTracker::new();

        tracker.start_tool("test_tool");
        tracker.fail_tool("test_tool", "Something went wrong");

        let tool = tracker.get_tool_status("test_tool").unwrap();
        assert_eq!(tool.status, ToolStatus::Error);
        assert!(tool.message.as_ref().unwrap().contains("went wrong"));
    }
}

/// Tauri command to get the status of active MCP tools
#[tauri::command]
pub fn get_mcp_tool_status(state: tauri::State<'_, McpStatusTracker>) -> Vec<ToolProgress> {
    state.get_active_tools()
}

/// Tauri command to get the status of a specific tool
#[tauri::command]
pub fn get_mcp_tool_progress(
    state: tauri::State<'_, McpStatusTracker>,
    tool_name: String,
) -> Option<ToolProgress> {
    state.get_tool_status(&tool_name)
}

/// Tauri command to get all tool statuses
#[tauri::command]
pub fn get_mcp_all_tools(state: tauri::State<'_, McpStatusTracker>) -> Vec<ToolProgress> {
    state.get_all_tools()
}

/// Tauri command to get available MCP tool definitions
#[tauri::command]
pub fn get_available_mcp_tools() -> Vec<crate::tools::ToolDefinition> {
    crate::tools::get_available_tools()
}
