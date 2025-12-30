use std::{
    borrow::Cow,
    path::{Path, PathBuf},
};

use tauri::{AppHandle, Manager};
use tokio::fs;
use tracing::debug;

pub fn quote_if_needed(s: &str) -> String {
    shell_escape::escape(Cow::Borrowed(s)).into_owned()
}

/// takes in a string flag and a string path and makes it a cli arg, handing quoting if the arg contains spaces
/// E.g. --project-root "/some path/with spaces"
pub fn make_cli_arg(flag: &str, path: &str) -> String {
    format!("{} {}", flag, quote_if_needed(path))
}

pub const PACKAGE_JSON_FILENAME: &str = "package.json";
pub const TSCONFIG_FILENAME: &str = "tsconfig.json";
pub const OUTPUTS_DIRECTORY: &str = "outputs";
pub const CONFIG_FILENAME: &str = "typeslayer.toml";

// Static list of known editors (cmd, human-readable name)
pub const AVAILABLE_EDITORS: &[(&str, &str)] = &[
    ("code", "VS Code"),
    ("cursor", "Cursor"),
    ("zed", "Zed"),
    ("nvim", "Neovim"),
    ("vim", "Vim"),
    ("idea", "IntelliJ IDEA"),
    ("pycharm", "PyCharm"),
    ("webstorm", "WebStorm"),
    ("subl", "Sublime Text"),
    ("emacs", "Emacs"),
    ("nano", "Nano"),
    ("hx", "Helix"),
    ("lapce", "Lapce"),
    ("lite-xl", "Lite XL"),
];

pub fn get_typeslayer_base_data_dir() -> PathBuf {
    if let Ok(env_dir) = std::env::var("TYPESLAYER_DATA_DIR") {
        PathBuf::from(env_dir)
    } else {
        #[cfg(target_os = "linux")]
        {
            if let Ok(home) = std::env::var("HOME") {
                return PathBuf::from(format!("{home}/.local/share/typeslayer"));
            }
        }
        #[cfg(target_os = "macos")]
        {
            if let Ok(home) = std::env::var("HOME") {
                return PathBuf::from(format!("{home}/Library/Application Support/typeslayer"));
            }
        }
        #[cfg(target_os = "windows")]
        {
            if let Ok(appdata) = std::env::var("APPDATA") {
                return PathBuf::from(format!("{appdata}\\typeslayer"));
            }
        }
        std::env::current_dir()
            .unwrap_or(PathBuf::from("."))
            .join("typeslayer")
    }
}

pub fn detect_project_root_from_cwd() -> Option<PathBuf> {
    let cwd = std::env::current_dir().ok()?;
    let pkg_path = cwd.join(PACKAGE_JSON_FILENAME);
    debug!(
        "[detect_project_root_from_cwd] checking for package.json in cwd: {}",
        cwd.display()
    );
    if pkg_path.exists() {
        debug!("found package.json in cwd: {}", pkg_path.display());
        return Some(cwd);
    }

    // Also check PWD environment variable in case cwd was changed
    if let Ok(pwd) = std::env::var("PWD") {
        let pwd_path = Path::new(&pwd).join(PACKAGE_JSON_FILENAME);
        debug!(
            "[detect_project_root_from_cwd] checking for package.json in PWD: {}",
            pwd
        );
        if pwd_path.exists() {
            debug!(
                "[detect_project_root_from_cwd] found package.json in PWD: {}",
                pwd_path.display()
            );
            return Some(PathBuf::from(pwd));
        }
    }

    debug!("[detect_project_root_from_cwd] no package.json found in cwd or PWD");
    None
}

/// Validates and normalizes a project root path to always return a directory.
/// If given a package.json file path, returns its parent directory.
/// If given a directory, returns it as-is.
/// Accepts any valid path - package.json is not required.
pub fn validate_project_root_path(s: &str) -> Result<PathBuf, String> {
    let p = Path::new(s);

    // If it's explicitly a package.json file, return its parent directory
    if p.file_name()
        .map(|f| f == PACKAGE_JSON_FILENAME)
        .unwrap_or(false)
    {
        if !p.exists() {
            return Err(format!("package.json not found at: {s}"));
        }
        return Ok(p
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| PathBuf::from(".")));
    }

    // If it's a directory, return it
    if p.is_dir() || !p.exists() {
        return Ok(p.to_path_buf());
    }

    Err(format!(
        "Path must be a directory or package.json file: {s}"
    ))
}

pub fn default_extra_tsc_flags() -> String {
    debug!("[default_extra_tsc_flags] requested default extra tsc flags");
    "--noEmit --incremental false --noErrorTruncation".to_string()
}

pub async fn file_mtime_iso(path: &Path) -> Option<String> {
    if let Ok(meta) = fs::metadata(path).await
        && let Ok(modified) = meta.modified()
    {
        return Some(chrono::DateTime::<chrono::Utc>::from(modified).to_rfc3339());
    }

    None
}

pub async fn compute_window_title(project_root: PathBuf) -> String {
    let default_title = "TypeSlayer".to_string();
    let package_json_path = project_root.join("package.json");
    // Attempt to read and parse the package.json name; fallback to default on any error.
    match fs::read_to_string(package_json_path)
        .await
        .ok()
        .and_then(|contents| serde_json::from_str::<serde_json::Value>(&contents).ok())
        .and_then(|v| {
            v.get("name")
                .and_then(|n| n.as_str())
                .map(|s| s.to_string())
        }) {
        Some(name) if !name.is_empty() => format!("{default_title} | {name}"),
        _ => default_title,
    }
}

pub async fn set_window_title(app: &AppHandle, title: String) -> Result<(), String> {
    let win = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;
    win.set_title(&title)
        .map_err(|e| format!("failed to set title: {e}"))
}

// get the user's platform at runtime as a string
// including, detect whether they're running on wsl
// for linux and macos, we also return the output of `uname`
pub fn get_platform() -> String {
    let info = os_info::get();
    format!(
        "{} {} {}",
        info.os_type(),
        info.version(),
        info.architecture().unwrap_or("unknown")
    )
    .to_string()
}
