use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tracing::info;

/// Represents the execution status of an MCP tool
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolStatus {
    /// Name of the tool
    pub command: String,
    /// Timestamp when the tool started execution (Unix seconds)
    pub started_at: u64,
}

/// Global MCP status tracker - tracks which tools are currently running
#[derive(Clone)]
pub struct McpStatusTracker {
    // Map of tool_name -> ToolStatus
    tools: Arc<Mutex<HashMap<String, ToolStatus>>>,
}

impl McpStatusTracker {
    /// Create a new MCP status tracker
    pub fn new() -> Self {
        Self {
            tools: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Mark a tool as started
    #[allow(dead_code)]
    pub fn start_tool(&self, tool_name: impl Into<String>) {
        let tool_name = tool_name.into();
        info!("MCP tool started: {}", tool_name);

        if let Ok(mut tools) = self.tools.lock() {
            tools.insert(
                tool_name.clone(),
                ToolStatus {
                    command: tool_name,
                    started_at: std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .map(|d| d.as_secs())
                        .unwrap_or(0),
                },
            );
        }
    }

    /// Mark a tool as finished (remove from running tools)
    #[allow(dead_code)]
    pub fn end_tool(&self, tool_name: &str) {
        info!("MCP tool completed: {}", tool_name);
        if let Ok(mut tools) = self.tools.lock() {
            tools.remove(tool_name);
        }
    }

    /// Get the status of a specific tool if it's running
    #[allow(dead_code)]
    pub fn get_tool_status(&self, tool_name: &str) -> Option<ToolStatus> {
        self.tools
            .lock()
            .ok()
            .and_then(|tools| tools.get(tool_name).cloned())
    }

    /// Get all currently running tools
    pub fn get_running_tools(&self) -> Vec<ToolStatus> {
        self.tools
            .lock()
            .ok()
            .map(|tools| tools.values().cloned().collect())
            .unwrap_or_default()
    }

    /// Clear all tool statuses
    #[allow(dead_code)]
    pub fn clear_all(&self) {
        if let Ok(mut tools) = self.tools.lock() {
            tools.clear();
        }
    }
}

impl Default for McpStatusTracker {
    fn default() -> Self {
        Self::new()
    }
}
