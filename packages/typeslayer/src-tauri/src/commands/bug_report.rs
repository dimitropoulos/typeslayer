use crate::{
    analytics::ANALYTICS_EVENTS_FILENAME,
    analyze_trace::constants::ANALYZE_TRACE_FILENAME,
    app_data::{AppData, AppMode},
    type_graph::TYPE_GRAPH_FILENAME,
    utils::{CONFIG_FILENAME, PACKAGE_JSON_FILENAME, TSCONFIG_FILENAME},
    validate::{
        trace_json::TRACE_JSON_FILENAME, types_json::TYPES_JSON_FILENAME,
        utils::CPU_PROFILE_FILENAME,
    },
};
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::Path;
use tauri::State;
use tokio::sync::Mutex;
use tracing::debug;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BugReportFile {
    pub name: String,
    pub description: String,
}

#[tauri::command]
pub async fn get_bug_report_files(
    state: State<'_, &Mutex<AppData>>,
) -> Result<Vec<BugReportFile>, String> {
    let data = state.lock().await;
    let mut files = Vec::new();

    let outputs_dir = data.outputs_dir();

    let bug_report_files = [
        (&data.data_dir, CONFIG_FILENAME, "TypeSlayer config file"),
        (&outputs_dir, TYPES_JSON_FILENAME, "Type definitions data"),
        (
            &outputs_dir,
            TRACE_JSON_FILENAME,
            "Compilation trace events",
        ),
        (
            &outputs_dir,
            ANALYZE_TRACE_FILENAME,
            "Trace analysis results",
        ),
        (&outputs_dir, TYPE_GRAPH_FILENAME, "Type relationship graph"),
        (&outputs_dir, CPU_PROFILE_FILENAME, "TypeScript CPU profile"),
        (
            &data.data_dir,
            ANALYTICS_EVENTS_FILENAME,
            "Local Events log",
        ),
        (
            &data.project_root,
            PACKAGE_JSON_FILENAME,
            "Project package configuration",
        ),
    ];

    for (dir_path, filename, description) in bug_report_files {
        let file_path = dir_path.join(filename);
        if file_path.exists() {
            files.push(BugReportFile {
                name: filename.to_string(),
                description: description.to_string(),
            });
        }
    }

    // Check if selected tsconfig exists
    if let Some(tsconfig_path) = &data.selected_tsconfig
        && tsconfig_path.exists()
    {
        let filename = tsconfig_path
            .file_name()
            .and_then(|f| f.to_str())
            .unwrap_or(TSCONFIG_FILENAME);
        files.push(BugReportFile {
            name: filename.to_string(),
            description: "TypeScript compiler configuration".to_string(),
        });
    }

    Ok(files)
}

#[tauri::command]
pub async fn create_bug_report(
    state: State<'_, &Mutex<AppData>>,
    description: String,
    stdout: Option<String>,
    stderr: Option<String>,
) -> Result<String, String> {
    let data = state.lock().await;
    let outputs_dir = data.outputs_dir();
    let data_dir = data.data_dir.clone();

    // Create bug report zip file
    let downloads_dir =
        dirs::download_dir().ok_or_else(|| "Could not find downloads directory".to_string())?;

    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let zip_filename = format!("typeslayer_bug_report_{timestamp}.zip");
    let zip_path = downloads_dir.join(&zip_filename);

    let zip_path_inner = zip_path.clone();
    tauri::async_runtime::spawn_blocking(move || {
        // Create the zip file
        let file = std::fs::File::create(zip_path_inner)
            .map_err(|e| format!("Failed to create zip file: {e}"))?;

        let mut zip = zip::ZipWriter::new(file);
        let options = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated);

        // Add description as a text file
        zip.start_file("description", options)
            .map_err(|e| format!("Failed to add description file: {e}"))?;
        zip.write_all(description.as_bytes())
            .map_err(|e| format!("Failed to write description: {e}"))?;

        // Add stdout if provided
        if let Some(stdout_content) = stdout {
            zip.start_file("stdout", options)
                .map_err(|e| format!("Failed to add stdout file: {e}"))?;
            zip.write_all(stdout_content.as_bytes())
                .map_err(|e| format!("Failed to write stdout: {e}"))?;
        }

        // Add stderr if provided
        if let Some(stderr_content) = stderr {
            zip.start_file("stderr", options)
                .map_err(|e| format!("Failed to add stderr file: {e}"))?;
            zip.write_all(stderr_content.as_bytes())
                .map_err(|e| format!("Failed to write stderr: {e}"))?;
        }
        // Define the files to include
        let files_to_include = [
            CONFIG_FILENAME,
            ANALYTICS_EVENTS_FILENAME,
            TYPES_JSON_FILENAME,
            TRACE_JSON_FILENAME,
            ANALYZE_TRACE_FILENAME,
            TYPE_GRAPH_FILENAME,
            CPU_PROFILE_FILENAME,
        ];

        // Add each file to the zip
        for filename in files_to_include {
            let file_path = if filename == CONFIG_FILENAME || filename == ANALYTICS_EVENTS_FILENAME
            {
                // typeslayer.toml and events.ndjson are in the data directory
                data_dir.join(filename)
            } else {
                // Other files are in the outputs directory
                outputs_dir.join(filename)
            };

            if file_path.exists() {
                let mut file = std::fs::File::open(&file_path)
                    .map_err(|e| format!("Failed to open {filename}: {e}"))?;

                zip.start_file(filename, options)
                    .map_err(|e| format!("Failed to add {filename} to zip: {e}"))?;
                std::io::copy(&mut file, &mut zip)
                    .map_err(|e| format!("Failed to write {filename} to zip: {e}"))?;
            }
        }

        zip.finish()
            .map_err(|e| format!("Failed to finalize zip file: {e}"))?;

        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())??;

    Ok(zip_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn upload_bug_report(
    state: State<'_, &Mutex<AppData>>,
    zip_path: String,
) -> Result<(), String> {
    let zip_path = Path::new(&zip_path);
    if !zip_path.exists() {
        debug!("Zip file does not exist: {}", zip_path.display());
        return Err("Zip file does not exist".to_string());
    }

    let (outputs_dir, data_dir) = {
        let data = state.lock().await;
        (data.outputs_dir().clone(), data.data_dir.clone())
    };

    // Clone paths for the blocking unzip task so originals remain available
    let outputs_dir_for_unzip = outputs_dir.clone();
    let data_dir_for_unzip = data_dir.clone();

    // Clear the outputs directory first
    {
        let mut data = state.lock().await;
        data.clear_outputs_dir().await?;
    }

    // Unzip and process files in a blocking task
    let zip_path = zip_path.to_path_buf();
    tauri::async_runtime::spawn_blocking(move || {
        let file =
            std::fs::File::open(&zip_path).map_err(|e| format!("Failed to open zip file: {e}"))?;

        let mut archive =
            zip::ZipArchive::new(file).map_err(|e| format!("Failed to read zip archive: {e}"))?;

        // Extract each file
        for i in 0..archive.len() {
            let mut file = archive
                .by_index(i)
                .map_err(|e| format!("Failed to read zip entry: {e}"))?;

            let filename = file.name().to_string();

            // Determine destination path
            let dest_path = if filename == CONFIG_FILENAME {
                // typeslayer.toml goes to data directory
                data_dir_for_unzip.join(&filename)
            } else {
                // All other files go to outputs directory
                outputs_dir_for_unzip.join(&filename)
            };

            let mut dest = std::fs::File::create(dest_path)
                .map_err(|e| format!("could not create file: {e}"))?;
            std::io::copy(&mut file, &mut dest)
                .map_err(|e| format!("Failed to extract {}: {}", &filename, &e))?;
        }

        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())??;

    let new_app_data = AppData::new(data_dir.clone(), AppMode::GUI)
        .await
        .map_err(|e| format!("Failed to reinitialize app data: {e}"))?;

    {
        let mut data = state.lock().await;
        *data = new_app_data;
    }

    Ok(())
}
