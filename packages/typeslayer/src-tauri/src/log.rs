use std::path::PathBuf;
use tracing_subscriber::{EnvFilter, fmt, prelude::*};

pub const LOG_FILENAME: &str = "typeslayer.log";

pub fn init(data_dir: PathBuf) {
    let verbose = std::env::args().any(|arg| arg == "--verbose");
    let default_level = if verbose { "debug" } else { "warn" };

    let stdout_filter =
        EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(default_level));
    let stdout_layer = fmt::layer()
        .with_target(false)
        .with_level(true)
        .compact()
        .with_filter(stdout_filter);

    let file_appender = tracing_appender::rolling::never(&data_dir, LOG_FILENAME);
    let file_filter = EnvFilter::new("debug");
    let file_layer = fmt::layer()
        .with_writer(file_appender)
        .with_ansi(false)
        .with_filter(file_filter);

    tracing_subscriber::registry()
        .with(stdout_layer)
        .with(file_layer)
        .init();
}
