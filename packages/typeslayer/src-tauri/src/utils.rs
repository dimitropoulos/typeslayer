use std::process::Stdio;

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

pub fn command_exists(cmd: &str) -> bool {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("where")
            .arg(cmd)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }

    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("command")
            .arg("-v")
            .arg(cmd)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }
}
