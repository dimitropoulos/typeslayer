pub mod resources;
pub mod status;
pub mod tools;

use crate::app_data::AppData;
use rmcp::{
    ServerHandler, ServiceExt,
    handler::server::tool::ToolRouter,
    model::{ServerCapabilities, ServerInfo},
    tool, tool_handler, tool_router,
    transport::stdio,
};
use std::{
    io,
    sync::{Arc, Mutex},
};
use tracing::info;
use tracing_subscriber::EnvFilter;

/// MCP Server for TypeSlayer
///
/// Provides tools for analyzing TypeScript compilation performance via MCP protocol.
#[derive(Clone)]
pub struct TypeSlayerMcpServer {
    app_data: Arc<Mutex<AppData>>,
    pub status: status::McpStatusTracker,
    tool_router: ToolRouter<Self>,
}

#[tool_router]
impl TypeSlayerMcpServer {
    pub fn new(app_data: Arc<Mutex<AppData>>) -> Self {
        info!("Initializing TypeSlayer MCP Server");
        Self {
            app_data,
            status: status::McpStatusTracker::new(),
            tool_router: Self::tool_router(),
        }
    }

    #[tool(
        description = "Identifies duplicate packages in the node_modules tree. Duplicate packages increase bundle size and compilation time."
    )]
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

    #[tool(
        description = "Analyzes TypeScript compilation traces to identify performance hotspots - the types that take the most time to check."
    )]
    async fn get_hots_types(&self) -> String {
        let command = crate::mcp::tools::get_hot_types::COMMAND;
        self.status.start_tool(command);
        let result =
            crate::mcp::tools::get_hot_types::execute(std::sync::Arc::clone(&self.app_data)).await;
        self.status.end_tool(command);
        result
    }

    #[tool(
        description = "Returns the files that took the longest to compile, based on the trace data used by the treemap."
    )]
    async fn get_hot_files(&self) -> String {
        let command = crate::mcp::tools::get_hot_files::COMMAND;
        self.status.start_tool(command);
        let result =
            crate::mcp::tools::get_hot_files::execute(std::sync::Arc::clone(&self.app_data)).await;
        self.status.end_tool(command);
        result
    }

    #[tool(
        description = "Returns depth limit events grouped by category (e.g., instantiateType_DepthLimit, checkTypeRelatedTo_DepthLimit). These are TypeScript compiler internal limits hit during type checking."
    )]
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

#[tool_handler]
impl ServerHandler for TypeSlayerMcpServer {
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
}

/// Run the MCP server in STDIO mode with pre-created AppData
///
/// This is called when the binary is invoked with the 'mcp' subcommand.
/// It receives shared AppData created in main.rs and serves the MCP protocol.
#[tokio::main]
pub async fn run_mcp_server(app_data: Arc<Mutex<AppData>>) -> io::Result<()> {
    // Initialize logging to stderr (stdout is used for MCP protocol)
    let verbose = std::env::args().any(|arg| arg == "--verbose");
    let default_level = if verbose { "info" } else { "warn" };
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::from_default_env().add_directive(default_level.parse().unwrap()),
        )
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
