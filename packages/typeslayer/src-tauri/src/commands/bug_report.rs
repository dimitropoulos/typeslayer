use crate::{
    analyze_trace::constants::ANALYZE_TRACE_FILENAME,
    app_data::AppData,
    type_graph::TYPE_GRAPH_FILENAME,
    utils::{CONFIG_FILENAME, PACKAGE_JSON_FILENAME, TSCONFIG_FILENAME},
    validate::{
        trace_json::TRACE_JSON_FILENAME, types_json::TYPES_JSON_FILENAME,
        utils::CPU_PROFILE_FILENAME,
    },
};
use std::io::Write;
use tauri::State;
use tokio::sync::Mutex;

#[derive(serde::Serialize, serde::Deserialize)]
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

    // Check typescript.toml in data directory
    let typescript_toml_path = data.data_dir.join(CONFIG_FILENAME);
    if typescript_toml_path.exists() {
        files.push(BugReportFile {
            name: "typescript.toml".to_string(),
            description: "TypeScript configuration".to_string(),
        });
    }

    // Check output files only if they exist
    let output_files = [
        ("types.json", TYPES_JSON_FILENAME, "Type definitions data"),
        (
            "trace.json",
            TRACE_JSON_FILENAME,
            "Compilation trace events",
        ),
        (
            "analyze-trace.json",
            ANALYZE_TRACE_FILENAME,
            "Trace analysis results",
        ),
        (
            "type-graph.json",
            TYPE_GRAPH_FILENAME,
            "Type relationship graph",
        ),
        (
            "tsc.cpuprofile",
            CPU_PROFILE_FILENAME,
            "TypeScript CPU profile",
        ),
    ];

    for (zip_name, filename, description) in output_files {
        let file_path = outputs_dir.join(filename);
        if file_path.exists() {
            files.push(BugReportFile {
                name: zip_name.to_string(),
                description: description.to_string(),
            });
        }
    }

    // Check if package.json exists
    let project_root = &data.project_root;
    let pkg_json_path = project_root;
    if pkg_json_path.exists()
        && pkg_json_path.is_file()
        && pkg_json_path
            .file_name()
            .map(|f| f == PACKAGE_JSON_FILENAME)
            .unwrap_or(false)
    {
        files.push(BugReportFile {
            name: PACKAGE_JSON_FILENAME.to_string(),
            description: "Project package configuration".to_string(),
        });
    } else if pkg_json_path.is_dir() {
        let pkg_json_in_dir = pkg_json_path.join(PACKAGE_JSON_FILENAME);
        if pkg_json_in_dir.exists() {
            files.push(BugReportFile {
                name: PACKAGE_JSON_FILENAME.to_string(),
                description: "Project package configuration".to_string(),
            });
        }
    }

    // Check if selected tsconfig exists
    if let Some(tsconfig_path) = &data.selected_tsconfig {
        if tsconfig_path.exists() {
            let filename = tsconfig_path
                .file_name()
                .and_then(|f| f.to_str())
                .unwrap_or(TSCONFIG_FILENAME);
            files.push(BugReportFile {
                name: filename.to_string(),
                description: "TypeScript compiler configuration".to_string(),
            });
        }
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
    let outputs_dir = data.outputs_dir().clone();
    let data_dir = data.data_dir.clone();

    // Create bug report zip file
    let downloads_dir =
        dirs::download_dir().ok_or_else(|| "Could not find downloads directory".to_string())?;

    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let zip_filename = format!("typeslayer_bug_report_{}.zip", timestamp);
    let zip_path = downloads_dir.join(&zip_filename);

    let zip_path_inner = zip_path.clone();
    tauri::async_runtime::spawn_blocking(move || {
        // Create the zip file
        let file = std::fs::File::create(zip_path_inner)
            .map_err(|e| format!("Failed to create zip file: {}", e))?;

        let mut zip = zip::ZipWriter::new(file);
        let options = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated);

        // Add description as a text file
        zip.start_file("description", options)
            .map_err(|e| format!("Failed to add description file: {}", e))?;
        zip.write_all(description.as_bytes())
            .map_err(|e| format!("Failed to write description: {}", e))?;

        // Add stdout if provided
        if let Some(stdout_content) = stdout {
            zip.start_file("stdout", options)
                .map_err(|e| format!("Failed to add stdout file: {}", e))?;
            zip.write_all(stdout_content.as_bytes())
                .map_err(|e| format!("Failed to write stdout: {}", e))?;
        }

        // Add stderr if provided
        if let Some(stderr_content) = stderr {
            zip.start_file("stderr", options)
                .map_err(|e| format!("Failed to add stderr file: {}", e))?;
            zip.write_all(stderr_content.as_bytes())
                .map_err(|e| format!("Failed to write stderr: {}", e))?;
        }
        // Define the files to include
        let files_to_include = [
            CONFIG_FILENAME,
            TYPES_JSON_FILENAME,
            TRACE_JSON_FILENAME,
            ANALYZE_TRACE_FILENAME,
            TYPE_GRAPH_FILENAME,
            CPU_PROFILE_FILENAME,
        ];

        // Add each file to the zip
        for filename in files_to_include {
            let file_path = if filename == CONFIG_FILENAME {
                // typescript.toml is in the data directory
                data_dir.join(filename)
            } else {
                // Other files are in the outputs directory
                outputs_dir.join(filename)
            };

            if file_path.exists() {
                let contents = std::fs::read(&file_path)
                    .map_err(|e| format!("Failed to read {}: {}", filename, e))?;

                zip.start_file(filename, options)
                    .map_err(|e| format!("Failed to add {} to zip: {}", filename, e))?;
                zip.write_all(&contents)
                    .map_err(|e| format!("Failed to write {} to zip: {}", filename, e))?;
            }
        }

        zip.finish()
            .map_err(|e| format!("Failed to finalize zip file: {}", e))?;

        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())??;

    Ok(zip_path.to_string_lossy().to_string())
}
