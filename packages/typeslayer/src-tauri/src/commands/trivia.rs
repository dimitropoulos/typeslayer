use crate::{
    analytics::event_type_graph_success::StrippedLinkKindData,
    analyze_trace::constants::ANALYZE_TRACE_FILENAME,
    app_data::AppData,
    type_graph::{LinkKind, TYPE_GRAPH_FILENAME},
    utils::AVAILABLE_EDITORS,
    validate::trace_json::TraceEvent,
    validate::{
        trace_json::TRACE_JSON_FILENAME,
        types_json::{Flag, TYPES_JSON_FILENAME},
        utils::CPU_PROFILE_FILENAME,
    },
};
use indexmap::IndexMap;
use indexmap::IndexSet;
use std::{cmp::Reverse, collections::BinaryHeap, collections::HashMap, path::Path};
use tauri::State;
use tokio::sync::Mutex;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppStats {
    pub types_count: usize,
    pub links_count: usize,
}

#[tauri::command]
pub async fn get_app_stats(state: State<'_, &Mutex<AppData>>) -> Result<AppStats, String> {
    let app_data = state.lock().await;
    Ok(AppStats {
        // we synthetically insert id:0 to make it so you can just index the vec to lookup by id
        types_count: if app_data.types_json.is_empty() {
            0
        } else {
            app_data.types_json.len() - 1
        },
        links_count: app_data
            .type_graph
            .as_ref()
            .map_or(0, |graph| graph.calculate_links_total()),
    })
}

#[tauri::command]
pub async fn get_available_editors(
    state: State<'_, &Mutex<AppData>>,
) -> Result<Vec<(String, String)>, String> {
    let _ = state; // unused
    Ok(AVAILABLE_EDITORS
        .iter()
        .map(|(c, n)| (c.to_string(), n.to_string()))
        .collect())
}

#[tauri::command]
pub async fn get_tsc_example_call(state: State<'_, &Mutex<AppData>>) -> Result<String, String> {
    let app_data = state.lock().await;
    Ok(app_data.get_example_tsc_call())
}

#[tauri::command]
pub async fn get_output_file_sizes(
    state: State<'_, &Mutex<AppData>>,
) -> Result<HashMap<String, u64>, String> {
    use std::fs;

    let app_data = state.lock().await;
    let outputs_dir = app_data.outputs_dir().to_string_lossy().to_string();

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

#[tauri::command]
pub async fn get_compilation_files(
    state: State<'_, &Mutex<AppData>>,
) -> Result<Vec<String>, String> {
    let app_data = state.lock().await;
    let mut files: IndexSet<String> = IndexSet::new();

    for event in &app_data.trace_json {
        if let TraceEvent::CreateSourceFile { args, .. } = event {
            files.insert(args.path.clone());
        }
    }

    Ok(files.into_iter().collect())
}

#[tauri::command]
pub async fn get_type_kinds(
    state: State<'_, &Mutex<AppData>>,
) -> Result<Vec<(usize, String, Vec<Flag>)>, String> {
    let app_data = state.lock().await;
    if let Some(type_graph) = &app_data.type_graph {
        Ok(type_graph
            .type_kinds
            .iter()
            .map(|(k, v)| {
                (
                    *v,
                    format!("{:.2}%", (*v as f64 * 100.0) / type_graph.node_count as f64),
                    k.clone(),
                )
            })
            .collect())
    } else {
        Err("Type graph not available".to_string())
    }
}

#[tauri::command]
pub async fn get_link_kind_data_by_kind(
    state: State<'_, &Mutex<AppData>>,
) -> Result<IndexMap<LinkKind, StrippedLinkKindData>, String> {
    let app_data = state.lock().await;
    if let Some(type_graph) = &app_data.type_graph {
        Ok(type_graph
            .link_kind_data_by_kind
            .iter()
            .map(|(kind, link_kind_data)| {
                (kind.clone(), StrippedLinkKindData::from(link_kind_data))
            })
            .collect())
    } else {
        Err("Type graph not available".to_string())
    }
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LargestDisplayEntry {
    pub type_id: usize,
    pub display_bytes: usize,
    pub name: String,
    pub path: Option<String>,
}

#[tauri::command]
pub async fn get_largest_display_values(
    state: State<'_, &Mutex<AppData>>,
) -> Result<Vec<LargestDisplayEntry>, String> {
    let app_data = state.lock().await;
    if app_data.types_json.is_empty() {
        return Err("Types data not available".to_string());
    }

    let limit = app_data.settings.award_limit;

    // Min-heap keyed by display_bytes so the smallest of our top-k is always on top.
    // When a new entry is larger than the current minimum, we swap it in — O(n log k).
    let mut heap: BinaryHeap<Reverse<(usize, usize)>> = BinaryHeap::with_capacity(limit + 1);
    // Parallel vec to hold the full entry data, indexed by insertion order.
    let mut pool: Vec<LargestDisplayEntry> = Vec::with_capacity(limit + 1);

    for t in app_data.types_json.iter().skip(1) {
        if let Some(d) = &t.display {
            let bytes = d.len();

            // Fast path: if we already have `limit` entries and this one can't
            // beat the current minimum, skip it entirely.
            if heap.len() >= limit {
                let min_bytes = heap.peek().unwrap().0.0;
                if bytes <= min_bytes {
                    continue;
                }
                heap.pop(); // evict the smallest
            }

            let idx = pool.len();
            pool.push(LargestDisplayEntry {
                type_id: t.id,
                display_bytes: bytes,
                name: t.human_readable_name(),
                path: t.get_path(),
            });
            heap.push(Reverse((bytes, idx)));
        }
    }

    // Drain the heap and collect the surviving entries, then sort descending.
    let mut result: Vec<LargestDisplayEntry> = heap
        .into_iter()
        .map(|Reverse((_, idx))| {
            // Take ownership without cloning by swapping with a dummy.
            std::mem::replace(
                &mut pool[idx],
                LargestDisplayEntry {
                    type_id: 0,
                    display_bytes: 0,
                    name: String::new(),
                    path: None,
                },
            )
        })
        .collect();
    result.sort_by(|a, b| b.display_bytes.cmp(&a.display_bytes));

    Ok(result)
}
