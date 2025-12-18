use std::time::SystemTime;

use serde::Serialize;
use tauri::{AppHandle, Emitter};

#[derive(Serialize, Clone)]
#[serde(rename_all = "snake_case")]
pub enum TaskId {
    GenerateTrace,
    GenerateCpuProfile,
    GenerateAnalyzeTrace,
    GenerateTypeGraph,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TaskProgress {
    pub task_id: TaskId,
    pub start: u64,
    pub done: bool,
}

/// A guard that automatically stops a task when dropped (RAII pattern)
pub struct TaskGuard {
    app: AppHandle,
    task_id: TaskId,
}

impl Drop for TaskGuard {
    fn drop(&mut self) {
        let _ = self.app.emit(
            "tasks",
            TaskProgress {
                task_id: self.task_id.clone(),
                start: 0,
                done: true,
            },
        );
    }
}

/// Start a task and return a guard that will automatically stop it when dropped
pub fn start_task(app: AppHandle, task_id: TaskId) -> Result<TaskGuard, String> {
    app.emit(
        "tasks",
        TaskProgress {
            task_id: task_id.clone(),
            start: SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
            done: false,
        },
    )
    .map_err(|e| e.to_string())?;

    Ok(TaskGuard { app, task_id })
}
