use crate::validate::trace_json::TraceEvent;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreemapNode {
    pub name: String,
    pub value: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<TreemapNode>>,
}

/// Build treemap data from trace events, grouping by file and summing durations
pub fn build_treemap_from_trace(events: &[TraceEvent]) -> Vec<TreemapNode> {
    // Map file paths to total duration
    let mut file_durations: HashMap<String, f64> = HashMap::new();

    for event in events {
        // Extract file path from args if available
        if let Some(path_val) = event.args.get("path") {
            if let Some(path) = path_val.as_str() {
                if let Some(dur) = event.dur {
                    *file_durations.entry(path.to_string()).or_insert(0.0) += dur;
                }
            }
        }

        // Also handle checkSourceFile and bindSourceFile which have path in args
        match event.name.as_str() {
            "checkSourceFile" | "bindSourceFile" => {
                if let Some(path_val) = event.args.get("path") {
                    if let Some(path) = path_val.as_str() {
                        // For B/E events without dur, we'll need to match pairs
                        // For now, just track events with explicit duration
                        if let Some(dur) = event.dur {
                            *file_durations.entry(path.to_string()).or_insert(0.0) += dur;
                        }
                    }
                }
            }
            _ => {}
        }
    }

    // Build flat list of file nodes - no directory grouping
    let mut nodes: Vec<TreemapNode> = Vec::new();

    for (path, duration) in file_durations {
        let parts: Vec<&str> = path.split('/').collect();
        let filename = parts[parts.len() - 1].to_string();

        nodes.push(TreemapNode {
            name: filename,
            value: duration,
            path: Some(path),
            children: None,
        });
    }

    // Sort by duration descending
    nodes.sort_by(|a, b| b.value.partial_cmp(&a.value).unwrap());

    nodes
}
