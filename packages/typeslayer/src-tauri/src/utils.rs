use std::{
    fs,
    path::{Path, PathBuf},
    process::Stdio,
};

use shlex::Quoter;
use tracing::{debug, info};

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

pub fn get_typeslayer_base_data_dir() -> PathBuf {
    if let Ok(env_dir) = std::env::var("TYPESLAYER_DATA_DIR") {
        PathBuf::from(env_dir)
    } else {
        #[cfg(target_os = "linux")]
        {
            if let Ok(home) = std::env::var("HOME") {
                return PathBuf::from(format!("{}/.local/share/typeslayer", home));
            }
        }
        #[cfg(target_os = "macos")]
        {
            if let Ok(home) = std::env::var("HOME") {
                return PathBuf::from(format!("{}/Library/Application Support/typeslayer", home));
            }
        }
        #[cfg(target_os = "windows")]
        {
            if let Ok(appdata) = std::env::var("APPDATA") {
                return PathBuf::from(format!("{}\\typeslayer", appdata));
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
    info!("checking for package.json in cwd: {}", cwd.display());
    if pkg_path.exists() {
        info!("found package.json in cwd: {}", pkg_path.display());
        return Some(pkg_path);
    }

    // Also check PWD environment variable in case cwd was changed
    if let Ok(pwd) = std::env::var("PWD") {
        let pwd_path = Path::new(&pwd).join(PACKAGE_JSON_FILENAME);
        info!("checking for package.json in PWD: {}", pwd);
        if pwd_path.exists() {
            info!("found package.json in PWD: {}", pwd_path.display());
            return Some(pwd_path);
        }
    }

    info!("no package.json found in cwd or PWD");
    None
}

pub fn validate_project_root_path(s: &str) -> Result<PathBuf, String> {
    let p = Path::new(s);

    if p.file_name()
        .map(|f| f == PACKAGE_JSON_FILENAME)
        .unwrap_or(false)
    {
        if !p.exists() {
            return Err(format!("package.json not found at: {}", s));
        }
        return Ok(p.to_path_buf());
    }

    if p.exists() && p.is_dir() {
        let pkg_path = p.join(PACKAGE_JSON_FILENAME);
        if !pkg_path.exists() {
            return Err(format!("package.json not found in directory: {}", s));
        }
        return Ok(pkg_path);
    }

    Err(format!(
        "Path must be an existing package.json file or directory containing one: {}",
        s
    ))
}

pub fn default_extra_tsc_flags() -> String {
    debug!("[default_extra_tsc_flags] requested default extra tsc flags");
    return "--noEmit --incremental false --noErrorTruncation".to_string();
}

pub fn file_mtime_iso(path: &Path) -> Option<String> {
    if let Ok(meta) = fs::metadata(path) {
        if let Ok(modified) = meta.modified() {
            return Some(chrono::DateTime::<chrono::Utc>::from(modified).to_rfc3339());
        }
    }
    None
}

pub fn compute_window_title(project_root: PathBuf) -> String {
    let default_title = "TypeSlayer".to_string();
    // Attempt to read and parse the package.json name; fallback to default on any error.
    match std::fs::read_to_string(project_root)
        .ok()
        .and_then(|contents| serde_json::from_str::<serde_json::Value>(&contents).ok())
        .and_then(|v| {
            v.get("name")
                .and_then(|n| n.as_str())
                .map(|s| s.to_string())
        }) {
        Some(name) if !name.is_empty() => format!("{} | {}", default_title, name),
        _ => default_title,
    }
}
