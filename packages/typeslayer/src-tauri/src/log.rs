use tracing_subscriber::{EnvFilter, fmt};

pub fn init() {
    let verbose = std::env::args().any(|arg| arg == "--verbose");
    let default_level = if verbose { "debug" } else { "warn" };
    let env_filter =
        EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(default_level));
    let _ = fmt()
        .with_env_filter(env_filter)
        .with_target(false)
        .with_level(true)
        .compact()
        .try_init();
}
