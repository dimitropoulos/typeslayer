use tracing::level_filters::LevelFilter;
use tracing_subscriber::{EnvFilter, fmt};

pub fn init() {
    // In release (production), only log errors; in debug, use info by default.
    #[cfg(debug_assertions)]
    let default_level = LevelFilter::INFO;
    #[cfg(not(debug_assertions))]
    let default_level = LevelFilter::ERROR;

    // Allow override via RUST_LOG when needed.
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::from_default_env().add_directive(default_level.into()));

    let _ = fmt()
        .with_env_filter(env_filter)
        .with_target(false)
        .with_level(true)
        .compact()
        .try_init();
}
