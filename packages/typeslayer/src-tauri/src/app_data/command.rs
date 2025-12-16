use std::fmt::Display;

use crate::utils::quote_if_needed;
use serde::Deserialize;

pub struct TSCCommand {
    pub shell: String,     // The shell, e.g. `sh` or `cmd`
    pub shell_arg: String, // A arg for the shell like `-c` or `/c`.
    pub command: String,
    pub env: Vec<(String, String)>,
}

impl Display for TSCCommand {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        // Assumes POSIX-style environment. Can be adapted for Windows if needed.
        let mut env = self
            .env
            .iter()
            .map(|(key, value)| format!("{key}={}", quote_if_needed(&value)))
            .collect::<Vec<_>>()
            .join(" ");
        if env != "" {
            env += " ";
        }

        write!(f, "{}{}", env, self.command)
    }
}

#[derive(Clone, Debug)]
pub enum PackageManager {
    Bun,
    NPM,
    PNPM,
    Yarn,
}

// The format of a package.json file with only what we care about.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageJSON {
    pub package_manager: Option<String>,
}
