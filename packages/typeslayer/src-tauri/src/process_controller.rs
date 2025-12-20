use std::{
    process::{ExitStatus, Stdio},
    sync::Arc,
};

use tokio::{
    process::{ChildStderr, ChildStdout, Command},
    select,
    sync::Notify,
};

#[derive(Clone)]
pub struct ProcessController {
    cancel: Arc<Notify>,
}

impl Default for ProcessController {
    fn default() -> Self {
        Self::new()
    }
}

pub struct CommandOutput {
    pub status: ExitStatus,
    pub stdout: ChildStdout,
    pub stderr: ChildStderr,
}

impl ProcessController {
    pub fn new() -> Self {
        Self {
            cancel: Arc::new(Notify::new()),
        }
    }

    pub async fn run_command(&self, mut cmd: Command) -> Result<Option<CommandOutput>, String> {
        let mut child = cmd
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to execute command: {e}"))?;

        let stdout = child.stdout.take().expect("stdout to have been set");
        let stderr = child.stderr.take().expect("stderr to have been set");

        select! {
            result = child.wait() => {
                Ok(Some(CommandOutput {
                    status: result.map_err(|e| e.to_string())?,
                    stdout,
                    stderr
                }))
            }
            _ = self.cancel.notified() => {
                child.kill().await.map_err(|e| e.to_string())?;
                Ok(None)
            }
        }
    }

    pub fn request_cancel(&self) -> Result<(), String> {
        self.cancel.notify_waiters();

        Ok(())
    }
}
