#[cfg(unix)]
use std::io;
#[cfg(windows)]
use std::process::Command;
use std::sync::{Arc, Mutex};

#[derive(Default)]
struct ProcessState {
    current_pid: Option<u32>,
    cancel_requested: bool,
}

#[derive(Clone, Default)]
pub struct ProcessController {
    inner: Arc<Mutex<ProcessState>>,
}

impl ProcessController {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(ProcessState::default())),
        }
    }

    pub fn register_process(&self, pid: u32) {
        let mut state = self.inner.lock().expect("process controller poisoned");
        state.current_pid = Some(pid);
        state.cancel_requested = false;
    }

    pub fn clear_current_process(&self) {
        let mut state = self.inner.lock().expect("process controller poisoned");
        state.current_pid = None;
    }

    pub fn reset_cancel_flag(&self) {
        let mut state = self.inner.lock().expect("process controller poisoned");
        state.cancel_requested = false;
    }

    pub fn cancel_requested(&self) -> bool {
        let state = self.inner.lock().expect("process controller poisoned");
        state.cancel_requested
    }

    pub fn request_cancel(&self) -> Result<(), String> {
        let pid = {
            let mut state = self.inner.lock().expect("process controller poisoned");
            state.cancel_requested = true;
            state.current_pid
        };

        if let Some(pid) = pid {
            send_terminate_signal(pid)?;
        }

        Ok(())
    }
}

fn send_terminate_signal(pid: u32) -> Result<(), String> {
    #[cfg(unix)]
    unsafe {
        if libc::kill(pid as i32, libc::SIGTERM) == 0 {
            return Ok(());
        }
        return Err(io::Error::last_os_error().to_string());
    }

    #[cfg(windows)]
    {
        let status = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .status()
            .map_err(|e| format!("failed to execute taskkill: {e}"))?;
        if status.success() {
            Ok(())
        } else {
            Err("taskkill failed to terminate process".to_string())
        }
    }
}
