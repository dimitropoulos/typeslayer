use crate::app_data::AppData;
use axum::{
    Router,
    extract::{Path, State},
    response::IntoResponse,
    routing::get,
};
use std::sync::{Arc, Mutex};
use tower_http::cors::{Any, CorsLayer};
use tracing::{error, info};

/// Standalone HTTP server for serving output files
///
/// This server runs on port 4765 and serves files from the outputs directory.
/// It's independent of the Tauri app and can run alongside it.
pub async fn run_http_server(
    app_data: Arc<Mutex<AppData>>,
) -> Result<(), Box<dyn std::error::Error>> {
    info!("Starting HTTP server for outputs on port 4765");

    async fn serve_output(
        Path(name): Path<String>,
        State(app_data): State<Arc<Mutex<AppData>>>,
    ) -> impl IntoResponse {
        let outputs_dir = {
            let data = app_data.lock().unwrap();
            data.outputs_dir().to_string_lossy().to_string()
        };

        let path = std::path::Path::new(&outputs_dir).join(&name);

        match tokio::fs::read(&path).await {
            Ok(bytes) => {
                let content_type = if name.ends_with(".json") || name.ends_with(".cpuprofile") {
                    "application/json"
                } else {
                    "application/octet-stream"
                };

                ([("Content-Type", content_type)], bytes)
            }
            Err(e) => {
                error!("Failed to read {:?}: {}", path, e);
                ([("Content-Type", "text/plain")], Vec::new())
            }
        }
    }

    let cors = CorsLayer::new().allow_methods(Any).allow_origin(Any);

    let app_router = Router::new()
        .route("/outputs/:name", get(serve_output))
        .layer(cors)
        .with_state(app_data);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:4765").await?;

    info!("HTTP server listening on http://127.0.0.1:4765");

    axum::serve(listener, app_router.into_make_service()).await?;

    Ok(())
}
