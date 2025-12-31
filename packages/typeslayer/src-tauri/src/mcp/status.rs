use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
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
    tools: Arc<Mutex<IndexMap<String, ToolStatus>>>,
}

impl McpStatusTracker {
    /// Create a new MCP status tracker
    pub fn new() -> Self {
        Self {
            tools: Arc::new(Mutex::new(IndexMap::new())),
        }
    }

    /// Mark a tool as started
    #[allow(dead_code)]
    pub async fn start_tool(&self, tool_name: impl Into<String>) {
        let tool_name = tool_name.into();
        info!("MCP tool started: {}", tool_name);

        let mut tools = self.tools.lock().await;
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

    /// Mark a tool as finished (remove from running tools)
    #[allow(dead_code)]
    pub async fn end_tool(&self, tool_name: &str) {
        info!("MCP tool completed: {}", tool_name);
        let mut tools = self.tools.lock().await;
        tools.shift_remove(tool_name);
    }

    /// Get the status of a specific tool if it's running
    #[allow(dead_code)]
    pub async fn get_tool_status(&self, tool_name: &str) -> Option<ToolStatus> {
        let tools = self.tools.lock().await;
        tools.get(tool_name).cloned()
    }

    /// Get all currently running tools
    pub async fn get_running_tools(&self) -> Vec<ToolStatus> {
        let tools = self.tools.lock().await;
        tools.values().cloned().collect()
    }

    /// Clear all tool statuses
    #[allow(dead_code)]
    pub async fn clear_all(&self) {
        self.tools.lock().await.clear();
    }
}

impl Default for McpStatusTracker {
    fn default() -> Self {
        Self::new()
    }
}
