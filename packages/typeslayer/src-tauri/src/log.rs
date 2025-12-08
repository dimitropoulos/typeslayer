use tracing_subscriber::{EnvFilter, fmt};

pub fn init() {
    // Always log INFO in GUI mode so we can see HTTP server startup
    // Use RUST_LOG env var to override if needed
    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    let _ = fmt()
        .with_env_filter(env_filter)
        .with_target(false)
        .with_level(true)
        .compact()
        .try_init();
}
