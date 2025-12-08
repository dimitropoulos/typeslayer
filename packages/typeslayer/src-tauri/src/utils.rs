pub fn quote_if_needed(s: &str) -> String {
    if s.contains(' ') {
        format!("\"{}\"", s)
    } else {
        s.to_string()
    }
}

/// takes in a string flag and a string path and makes it a cli arg, handing quoting if the arg contains spaces
/// E.g. --project-root "/some path/with spaces"
pub fn make_cli_arg(flag: &str, path: &str) -> String {
    format!("{} {}", flag, quote_if_needed(path))
}

pub const PACKAGE_JSON_FILENAME: &str = "package.json";
pub const TSCONFIG_FILENAME: &str = "tsconfig.json";
