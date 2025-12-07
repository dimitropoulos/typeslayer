use crate::app_data::AppData;
use rmcp::{
    ServerHandler, ServiceExt,
    model::{ServerCapabilities, ServerInfo},
    tool,
    transport::stdio,
};
use serde::{Deserialize, Serialize};
use std::{
    io,
    sync::{Arc, Mutex},
};
use tauri::AppHandle;
use tracing::info;
use tracing_subscriber::EnvFilter;

/// MCP Server for TypeSlayer
///
/// Provides tools for analyzing TypeScript compilation performance via MCP protocol.
#[derive(Clone)]
pub struct TypeSlayerMcpServer {
    app_data: Arc<Mutex<AppData>>,
}

impl TypeSlayerMcpServer {
    pub fn new(app_data: Arc<Mutex<AppData>>) -> Self {
        info!("Initializing TypeSlayer MCP Server");
        Self { app_data }
    }

    /// Constructor for use within Tauri app (with AppHandle)
    #[allow(dead_code)]
    pub fn new_with_handle(app_data: Arc<Mutex<AppData>>, _app_handle: AppHandle) -> Self {
        Self::new(app_data)
    }
}

#[tool(tool_box)]
impl TypeSlayerMcpServer {
    /// Get hotspots from the current analyze-trace data
    #[tool(
        description = "Analyze TypeScript compilation trace to identify performance hotspots. Returns the types that are taking the most time to check, along with their file locations and durations."
    )]
    async fn get_hotspots(&self) -> String {
        info!("get_hotspots called");

        // Lock app_data to access analyze_trace
        let data = match self.app_data.lock() {
            Ok(d) => d,
            Err(e) => return format!("{{\"error\": \"Failed to lock app data: {}\"}}", e),
        };

        // Check if analyze-trace data is available
        let analyze_trace = match data.analyze_trace.as_ref() {
            Some(at) => at,
            None => return r#"{"error": "No analyze-trace data available. Please run trace analysis first."}"#.to_string(),
        };

        // For now, use default limits - parameters can be added later
        let limit = 100;

        // Filter and limit hotspots
        let mut hotspots = analyze_trace.hot_spots.clone();
        hotspots.truncate(limit);

        // Build response
        let response = GetHotspotsResponse {
            hotspots: hotspots
                .iter()
                .map(|h| HotspotInfo {
                    time_ms: h.time_ms,
                    description: h.description.clone(),
                    file_path: h.path.clone(),
                    types_count: h.types.as_ref().map(|t| t.len()).unwrap_or(0),
                })
                .collect(),
            total_hotspots: analyze_trace.hot_spots.len(),
        };

        let json_response = serde_json::to_string_pretty(&response)
            .unwrap_or_else(|e| format!("{{\"error\": \"Failed to serialize response: {}\"}}", e));

        info!(
            "get_hotspots returning {} hotspots (total: {})",
            response.hotspots.len(),
            response.total_hotspots
        );

        json_response
    }
}

#[tool(tool_box)]
impl ServerHandler for TypeSlayerMcpServer {
    fn get_info(&self) -> ServerInfo {
        ServerInfo {
            instructions: Some(
                "TypeSlayer MCP Server - Analyze TypeScript compilation performance".into(),
            ),
            capabilities: ServerCapabilities::builder().enable_tools().build(),
            ..Default::default()
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct GetHotspotsResponse {
    hotspots: Vec<HotspotInfo>,
    total_hotspots: usize,
}

#[derive(Debug, Serialize, Deserialize)]
struct HotspotInfo {
    time_ms: i64,
    description: String,
    file_path: Option<String>,
    types_count: usize,
}

/// Run the MCP server in STDIO mode
///
/// This is called when the binary is invoked with the 'mcp' subcommand.
/// It creates a headless Tauri app to access AppData, then serves the MCP protocol.
#[tokio::main]
pub async fn run_mcp_server() -> io::Result<()> {
    // Initialize logging to stderr (stdout is used for MCP protocol)
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive(tracing::Level::INFO.into()))
        .with_writer(std::io::stderr)
        .with_ansi(false)
        .init();

    info!("Starting TypeSlayer MCP Server");
    info!("Protocol: Model Context Protocol (MCP)");
    info!("Transport: STDIO");
    info!("Running in standalone MCP mode");
    info!("Reading data from TYPESLAYER_DATA_DIR or default location");

    // Create AppData in standalone mode (doesn't need AppHandle)
    let data_dir = crate::files::get_typeslayer_base_data_dir(None, None);
    let app_data = Arc::new(Mutex::new(AppData::new(data_dir)));

    // Create the MCP server
    let server = TypeSlayerMcpServer::new(app_data);

    // Run the MCP server using STDIO transport
    let running = server.serve(stdio()).await.map_err(|e| {
        io::Error::new(
            io::ErrorKind::Other,
            format!("MCP server initialization error: {}", e),
        )
    })?;

    info!("MCP server started successfully");

    // Wait for completion
    let quit_reason = running
        .waiting()
        .await
        .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("MCP server error: {}", e)))?;

    info!("MCP server shutting down: {:?}", quit_reason);
    Ok(())
}
