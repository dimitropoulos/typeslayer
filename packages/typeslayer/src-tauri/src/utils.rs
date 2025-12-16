use std::path::PathBuf;
use std::process::Stdio;

use shlex::Quoter;
use tokio::io::AsyncReadExt;
use tracing::debug;

pub fn quote_if_needed(s: &str) -> String {
    // Equivalent to the now deprecated try_quote.
    // Should never panic since the only error is only possible with `allow_nul(false)`
    Quoter::new().allow_nul(true).quote(s).unwrap().into_owned()
}

/// takes in a string flag and a string path and makes it a cli arg, handing quoting if the arg contains spaces
/// E.g. --project-root "/some path/with spaces"
pub fn make_cli_arg(flag: &str, path: &str) -> String {
    format!("{} {}", flag, quote_if_needed(path))
}

pub const PACKAGE_JSON_FILENAME: &str = "package.json";
pub const TSCONFIG_FILENAME: &str = "tsconfig.json";
pub const OUTPUTS_DIRECTORY: &str = "outputs";

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

pub async fn get_output_file_preview(path: &PathBuf) -> Result<String, String> {
    let mut file = tokio::fs::File::open(path)
        .await
        .map_err(|e| format!("Failed to open {}: {}", path.display(), e))?;
    let mut buf = vec![0u8; 1024 * 100]; // 100 KiB
    let n = file
        .read(&mut buf)
        .await
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
    buf.truncate(n);
    debug!(
        "[get_output_file_preview]: read {} bytes from {}",
        n,
        path.display()
    );
    String::from_utf8(buf).map_err(|e| format!("Invalid UTF-8: {}", e))
}
