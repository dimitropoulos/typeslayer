pub mod resources;
pub mod status;
pub mod tools;

use crate::app_data::AppData;
use rmcp::{
    ErrorData as McpError, Service, ServiceExt,
    model::{ServerCapabilities, ServerInfo},
    service::{NotificationContext, RequestContext, RoleServer, ServiceRole},
    tool_router,
    transport::stdio,
};
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
    #[allow(dead_code)]
    app_data: Arc<Mutex<AppData>>,
    #[allow(dead_code)]
    pub status: status::McpStatusTracker,
}

impl TypeSlayerMcpServer {
    pub fn new(app_data: Arc<Mutex<AppData>>) -> Self {
        info!("Initializing TypeSlayer MCP Server");
        Self {
            app_data,
            status: status::McpStatusTracker::new(),
        }
    }

    /// Constructor for use within Tauri app (with AppHandle)
    #[allow(dead_code)]
    pub fn new_with_handle(app_data: Arc<Mutex<AppData>>, _app_handle: AppHandle) -> Self {
        Self::new(app_data)
    }
}

// Implement tool router for rmcp 0.10
#[tool_router]
impl TypeSlayerMcpServer {
    /// Get duplicate packages analysis
    async fn get_duplicate_packages(&self) -> String {
        let command = crate::mcp::tools::get_duplicate_packages::COMMAND;
        self.status.start_tool(command);
        let result = crate::mcp::tools::get_duplicate_packages::execute(std::sync::Arc::clone(
            &self.app_data,
        ))
        .await;
        self.status.end_tool(command);
        result
    }

    /// Get hot types analysis
    async fn get_hotspots(&self) -> String {
        let command = crate::mcp::tools::get_hot_types::COMMAND;
        self.status.start_tool(command);
        let result =
            crate::mcp::tools::get_hot_types::execute(std::sync::Arc::clone(&self.app_data)).await;
        self.status.end_tool(command);
        result
    }

    /// Get hot files analysis
    async fn get_hot_files(&self) -> String {
        let command = crate::mcp::tools::get_hot_files::COMMAND;
        self.status.start_tool(command);
        let result =
            crate::mcp::tools::get_hot_files::execute(std::sync::Arc::clone(&self.app_data)).await;
        self.status.end_tool(command);
        result
    }

    /// Get depth limits analysis
    async fn get_depth_limits(&self) -> String {
        let command = crate::mcp::tools::get_depth_limits::COMMAND;
        self.status.start_tool(command);
        let result =
            crate::mcp::tools::get_depth_limits::execute(std::sync::Arc::clone(&self.app_data))
                .await;
        self.status.end_tool(command);
        result
    }
}

impl Service<RoleServer> for TypeSlayerMcpServer {
    fn get_info(&self) -> ServerInfo {
        ServerInfo {
            instructions: Some(
                "TypeSlayer MCP Server - Analyze TypeScript compilation performance".into(),
            ),
            capabilities: ServerCapabilities::builder()
                .enable_tools()
                .enable_resources()
                .build(),
            ..Default::default()
        }
    }

    async fn handle_request(
        &self,
        _request: <RoleServer as ServiceRole>::PeerReq,
        _context: RequestContext<RoleServer>,
    ) -> Result<<RoleServer as ServiceRole>::Resp, McpError> {
        // In rmcp 0.10, the tool_router macro should handle all requests automatically.
        // This method serves as a fallback for any requests not handled by tool_router.
        // If we reach this point, it means the request wasn't handled by the router.
        info!("MCP: Unhandled request reached base service");
        Err(McpError::internal_error(
            "Request not handled - should be processed by tool_router",
            None,
        ))
    }

    async fn handle_notification(
        &self,
        _notification: <RoleServer as ServiceRole>::PeerNot,
        _context: NotificationContext<RoleServer>,
    ) -> Result<(), McpError> {
        // No notifications to handle for now
        Ok(())
    }
}

/// Run the MCP server in STDIO mode with pre-created AppData
///
/// This is called when the binary is invoked with the 'mcp' subcommand.
/// It receives shared AppData created in main.rs and serves the MCP protocol.
#[tokio::main]
pub async fn run_mcp_server(app_data: Arc<Mutex<AppData>>) -> io::Result<()> {
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

    // Create the MCP server with shared AppData
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
