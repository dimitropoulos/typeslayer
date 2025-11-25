use crate::files::normalize_path;

pub fn get_cli_arg(flag: &str) -> Option<String> {
    let args: Vec<String> = std::env::args().collect();
    args.windows(2)
        .find(|pair| pair[0] == flag)
        .map(|pair| pair[1].clone())
}

/// Resolve a path with precedence: CLI flag value > env var value > fallback.
/// Adds a trailing slash if missing.
pub fn resolve_path<F>(flag: &str, env_var: &str, fallback: F) -> String
where
    F: FnOnce() -> String,
{
    if let Some(cli) = get_cli_arg(flag) {
        return normalize_path(cli);
    }
    if let Ok(env_val) = std::env::var(env_var) {
        return normalize_path(env_val);
    }
    normalize_path(fallback())
}

/// Resolve a string value with precedence: CLI flag > env var > None.
/// Does not modify the value (no path normalization).
pub fn resolve_string(flag: &str, env_var: &str) -> Option<String> {
    if let Some(cli) = get_cli_arg(flag) {
        return Some(cli);
    }
    if let Ok(env_val) = std::env::var(env_var) {
        return Some(env_val);
    }
    None
}
