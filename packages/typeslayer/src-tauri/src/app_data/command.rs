use std::fmt::Display;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

pub struct TSCCommand {
    pub shell: String,     // The shell, e.g. `sh` or `cmd`
    pub shell_arg: String, // A arg for the shell like `-c` or `/c`.
    pub command: String,
}

impl Display for TSCCommand {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.command)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
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
