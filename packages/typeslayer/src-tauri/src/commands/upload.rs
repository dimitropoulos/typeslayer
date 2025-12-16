use crate::{
    analyze_trace::{AnalyzeTraceResult, analyze_trace, constants::ANALYZE_TRACE_FILENAME},
    app_data::AppData,
    type_graph::{TYPE_GRAPH_FILENAME, TypeGraph},
    validate::{
        trace_json::{TRACE_JSON_FILENAME, parse_trace_json},
        types_json::{TYPES_JSON_FILENAME, parse_types_json},
        utils::CPU_PROFILE_FILENAME,
    },
};
use std::path::{Path, PathBuf};
use tauri::State;
use tokio::sync::Mutex;

// Helper function for common upload validation and file operations
async fn upload_file_with_validation<T, F, U>(
    file_path: &str,
    dest_filename: &str,
    parser: F,
    state_updater: U,
    state: &State<'_, &Mutex<AppData>>,
) -> Result<T, String>
where
    T: Clone,
    F: Fn(&str, &str) -> Result<T, String>,
    U: Fn(&mut AppData, T) -> (),
{
    let path = Path::new(file_path);
    if !path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }

    // Read and validate the file
    let contents = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let parsed_data = parser(file_path, &contents)?;

    // Copy file to outputs directory
    let mut data = state.lock().await;
    let outputs_dir = data.outputs_dir();

    tokio::fs::create_dir_all(&outputs_dir)
        .await
        .map_err(|e| format!("Failed to create outputs directory: {}", e))?;

    let dest = outputs_dir.join(dest_filename);
    tokio::fs::copy(&path, &dest)
        .await
        .map_err(|e| format!("Failed to copy file: {}", e))?;

    // Update state
    state_updater(&mut data, parsed_data.clone());
    data.update_typeslayer_config_toml().await;

    Ok(parsed_data)
}

// Helper to find paired trace/types files
fn find_paired_file(path: &Path, from: &str, to: &str) -> PathBuf {
    let default_name = format!("{}.json", from);
    let filename = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(&default_name);
    let paired_filename = filename.replace(from, to);
    path.parent()
        .unwrap_or(Path::new("."))
        .join(paired_filename)
}

// Helper to regenerate analyze trace and type graph after upload
async fn regenerate_analysis_after_upload(
    state: &State<'_, &Mutex<AppData>>,
) -> Result<(), String> {
    let outputs_dir = state
        .lock()
        .await
        .outputs_dir()
        .to_string_lossy()
        .to_string();

    // Regenerate analyze trace
    let analyze_result = analyze_trace(&outputs_dir, None);
    let mut data = state.lock().await;
    if let Ok(result) = analyze_result {
        data.analyze_trace = Some(result);
    }

    // Generate type graph if both trace and types are available
    let should_generate_graph = !data.trace_json.is_empty() && !data.types_json.is_empty();

    if should_generate_graph {
        let types = &data.types_json;

        let graph = TypeGraph::from_types(types);

        // Store in AppData and persist to disk
        data.type_graph = Some(graph);

        // Persist to outputs/type-graph.json
        let outputs_dir = data.outputs_dir();
        let path = outputs_dir.join(TYPE_GRAPH_FILENAME);
        let json = serde_json::to_string_pretty(&data.type_graph)
            .map_err(|e| format!("Failed to serialize type_graph: {}", e))?;

        std::fs::create_dir_all(&outputs_dir)
            .map_err(|e| format!("Failed to create outputs directory: {}", e))?;
        std::fs::write(&path, json)
            .map_err(|e| format!("Failed to write type-graph.json: {}", e))?;
    }

    // Update outputs after regeneration
    data.update_typeslayer_config_toml().await;
    Ok(())
}

#[tauri::command]
pub async fn upload_trace_json(
    state: State<'_, &Mutex<AppData>>,
    file_path: String,
) -> Result<(), String> {
    use Path;

    let _trace_events = upload_file_with_validation(
        &file_path,
        TRACE_JSON_FILENAME,
        |path, contents| {
            parse_trace_json(path, contents)
                .map_err(|e| format!("Invalid trace.json format: {}", e))
        },
        |data, parsed| {
            data.trace_json = parsed;
            data.analyze_trace = None;
            data.type_graph = None;
        },
        &state,
    )
    .await?;

    // Handle paired types file
    let path = Path::new(&file_path);
    let types_path = find_paired_file(path, "trace", "types");
    if types_path.exists() {
        upload_file_with_validation(
            &types_path.to_string_lossy(),
            TYPES_JSON_FILENAME,
            |path, contents| {
                parse_types_json(path, contents)
                    .map_err(|e| format!("Invalid types.json format: {}", e))
            },
            |data, parsed| {
                data.types_json = parsed;
            },
            &state,
        )
        .await?;
    };

    // Regenerate analyze trace and type graph after upload
    if let Err(e) = regenerate_analysis_after_upload(&state).await {
        tracing::warn!("Failed to regenerate analysis after trace upload: {}", e);
    }

    Ok(())
}

#[tauri::command]
pub async fn upload_types_json(
    state: State<'_, &Mutex<AppData>>,
    file_path: String,
) -> Result<(), String> {
    use Path;

    let _types_json = upload_file_with_validation(
        &file_path,
        TYPES_JSON_FILENAME,
        |path, contents| {
            parse_types_json(path, contents)
                .map_err(|e| format!("Invalid types.json format: {}", e))
        },
        |data, parsed| {
            data.types_json = parsed;
            data.analyze_trace = None;
            data.type_graph = None;
        },
        &state,
    )
    .await?;

    // Handle paired trace file
    let path = Path::new(&file_path);
    let trace_path = find_paired_file(path, "types", "trace");
    if trace_path.exists() {
        upload_file_with_validation(
            &trace_path.to_string_lossy(),
            TRACE_JSON_FILENAME,
            |path, contents| {
                parse_trace_json(path, contents)
                    .map_err(|e| format!("Invalid trace.json format: {}", e))
            },
            |data, parsed| {
                data.trace_json = parsed;
            },
            &state,
        )
        .await?;
    };

    // Regenerate analyze trace and type graph after upload
    if let Err(e) = regenerate_analysis_after_upload(&state).await {
        tracing::warn!("Failed to regenerate analysis after types upload: {}", e);
    }

    Ok(())
}

#[tauri::command]
pub async fn upload_cpu_profile(
    state: State<'_, &Mutex<AppData>>,
    file_path: String,
) -> Result<(), String> {
    upload_file_with_validation(
        &file_path,
        CPU_PROFILE_FILENAME,
        |_path, contents| {
            serde_json::from_str::<serde_json::Value>(contents)
                .map_err(|e| format!("Invalid CPU profile format (not valid JSON): {}", e))?;
            Ok(contents.to_string())
        },
        |data, contents| {
            data.cpu_profile = Some(contents);
        },
        &state,
    )
    .await?;

    Ok(())
}

#[tauri::command]
pub async fn upload_analyze_trace(
    state: State<'_, &Mutex<AppData>>,
    file_path: String,
) -> Result<(), String> {
    upload_file_with_validation(
        &file_path,
        ANALYZE_TRACE_FILENAME,
        |_path, contents| {
            serde_json::from_str::<AnalyzeTraceResult>(contents)
                .map_err(|e| format!("Invalid analyze trace format: {}", e))
        },
        |data, result| {
            data.analyze_trace = Some(result);
        },
        &state,
    )
    .await?;

    Ok(())
}

#[tauri::command]
pub async fn upload_type_graph(
    state: State<'_, &Mutex<AppData>>,
    file_path: String,
) -> Result<(), String> {
    upload_file_with_validation(
        &file_path,
        TYPE_GRAPH_FILENAME.trim_start_matches('/'),
        |_path, contents| {
            serde_json::from_str::<TypeGraph>(contents)
                .map_err(|e| format!("Invalid type graph format: {}", e))
        },
        |data, graph| {
            data.type_graph = Some(graph);
        },
        &state,
    )
    .await?;

    Ok(())
}
