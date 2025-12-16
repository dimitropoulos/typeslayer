use crate::{
    analyze_trace::constants::ANALYZE_TRACE_FILENAME,
    app_data::AppData,
    type_graph::TYPE_GRAPH_FILENAME,
    utils::{AVAILABLE_EDITORS, make_cli_arg},
    validate::{
        trace_json::TRACE_JSON_FILENAME, types_json::TYPES_JSON_FILENAME,
        utils::CPU_PROFILE_FILENAME,
    },
};
use std::{
    collections::HashMap,
    path::Path,
    sync::{Arc, Mutex},
};
use tauri::State;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppStats {
    pub types_count: usize,
    pub links_count: usize,
}

#[tauri::command]
pub async fn get_app_stats(state: State<'_, Arc<Mutex<AppData>>>) -> Result<AppStats, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    Ok(AppStats {
        // we synthetically insert id:0 to make it so you can just index the vec to lookup by id
        types_count: data.types_json.len() - 1,
        links_count: data
            .type_graph
            .as_ref()
            .map_or(0, |graph| graph.links.len()),
    })
}

#[tauri::command]
pub async fn get_available_editors(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<Vec<(String, String)>, String> {
    let _ = state; // unused
    Ok(AVAILABLE_EDITORS
        .iter()
        .map(|(c, n)| (c.to_string(), n.to_string()))
        .collect())
}

#[tauri::command]
pub async fn get_tsc_example_call(state: State<'_, Arc<Mutex<AppData>>>) -> Result<String, String> {
    let data = state.lock().map_err(|e| e.to_string())?;
    let outputs_dir = data.outputs_dir().to_string_lossy().to_string();
    let flag = make_cli_arg("--generateTrace", outputs_dir.as_str());
    Ok(data.get_tsc_call(&flag)?.to_string())
}

#[tauri::command]
pub async fn get_output_file_sizes(
    state: State<'_, Arc<Mutex<AppData>>>,
) -> Result<HashMap<String, u64>, String> {
    use std::fs;

    let outputs_dir = {
        let data = state.lock().map_err(|e| e.to_string())?;
        data.outputs_dir().to_string_lossy().to_string()
    };

    let filenames = vec![
        ANALYZE_TRACE_FILENAME,
        TRACE_JSON_FILENAME,
        TYPES_JSON_FILENAME,
        CPU_PROFILE_FILENAME,
        TYPE_GRAPH_FILENAME,
    ];

    let mut sizes = HashMap::new();

    for filename in filenames {
        let path = Path::new(&outputs_dir).join(filename);
        if let Ok(metadata) = fs::metadata(&path) {
            sizes.insert(filename.to_string(), metadata.len());
        }
    }

    Ok(sizes)
}
