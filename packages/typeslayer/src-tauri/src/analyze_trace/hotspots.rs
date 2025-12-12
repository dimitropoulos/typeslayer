use crate::analyze_trace::types::{AnalyzeTraceOptions, EventSpan, EventSpanEvent, HotSpot};
use std::path::Path;

pub fn get_hotspots(
    hot_paths_tree: &EventSpan,
    options: &AnalyzeTraceOptions,
) -> Result<Vec<HotSpot>, String> {
    // `hot_paths_tree` is cloned ahead of time so that it can easily be sorted in-place without double-cloning.
    get_hotspots_worker(&mut hot_paths_tree.clone(), None, options)
}

fn get_hotspots_worker(
    span: &mut EventSpan,
    current_file: Option<String>,
    options: &AnalyzeTraceOptions,
) -> Result<Vec<HotSpot>, String> {
    let mut current_file = current_file;

    // Update current file if this is a check event
    if let EventSpanEvent::TraceEvent(event) = &span.event {
        if event.cat == "check" {
            if let Some(path) = event.args.get("path").and_then(|v| v.as_str()) {
                current_file = Some(path.to_string());
            }
        }
    }

    let mut children: Vec<HotSpot> = Vec::new();
    if !span.children.is_empty() {
        // Sort slow to fast
        let sorted_children = &mut span.children;
        sorted_children.sort_by(|a, b| b.duration.partial_cmp(&a.duration).unwrap());

        for child in sorted_children.iter_mut() {
            children.extend(get_hotspots_worker(child, current_file.clone(), options)?);
        }
    }

    match make_hot_frame(span, children) {
        Ok(hotspot) => Ok(vec![hotspot]),
        Err(children) => Ok(children),
    }
}

fn make_hot_frame(span: &EventSpan, children: Vec<HotSpot>) -> Result<HotSpot, Vec<HotSpot>> {
    let time_ms = (span.duration / 1000.0).round() as i64;

    if let EventSpanEvent::TraceEvent(event) = &span.event {
        match event.name.as_str() {
            "checkSourceFile" => {
                let file_path = event
                    .args
                    .get("path")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let normalized_path = Path::new(file_path).to_string_lossy().to_string();

                Ok(HotSpot {
                    description: format!("Check file {}", normalized_path),
                    time_ms,
                    path: Some(normalized_path),
                    children,
                    types: None,
                    start_line: None,
                    start_char: None,
                    start_offset: None,
                    end_line: None,
                    end_char: None,
                    end_offset: None,
                })
            }
            "structuredTypeRelatedTo" => {
                let source_id = event
                    .args
                    .get("sourceId")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(-1);
                let target_id = event
                    .args
                    .get("targetId")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(-1);

                Ok(HotSpot {
                    description: format!("Compare types {} and {}", source_id, target_id),
                    time_ms,
                    children,
                    types: Some(vec![source_id, target_id]),
                    path: None,
                    start_line: None,
                    start_char: None,
                    start_offset: None,
                    end_line: None,
                    end_char: None,
                    end_offset: None,
                })
            }
            "getVariancesWorker" => {
                let id = event.args.get("id").and_then(|v| v.as_i64()).unwrap_or(-1);

                Ok(HotSpot {
                    description: format!("Determine variance of type {}", id),
                    time_ms,
                    children,
                    types: Some(vec![id]),
                    path: None,
                    start_line: None,
                    start_char: None,
                    start_offset: None,
                    end_line: None,
                    end_char: None,
                    end_offset: None,
                })
            }
            "checkExpression" | "checkVariableDeclaration" => {
                let path = event
                    .args
                    .get("path")
                    .and_then(|v| v.as_str())
                    .map(|p| Path::new(p).to_string_lossy().to_string());

                Ok(HotSpot {
                    description: event.name.clone(),
                    time_ms,
                    path,
                    children: Vec::new(),
                    types: None,
                    start_line: None,
                    start_char: None,
                    start_offset: None,
                    end_line: None,
                    end_char: None,
                    end_offset: None,
                })
            }
            _ => Err(children),
        }
    } else {
        Err(children)
    }
}
