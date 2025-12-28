use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::{analyze_trace::create_spans, validate::trace_json::TraceEvent};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct FileStatistics {
    pub total_files: usize,
    pub total_duration: f64,
    pub mean_duration: f64,
    pub max_duration: f64,
    pub min_duration: f64,
}

pub fn create_file_statistics(trace_events: &[TraceEvent]) -> Result<FileStatistics, String> {
    // Create spans from trace events
    let parse_result = create_spans(trace_events)?;

    // Collect durations by file from the spans
    let mut file_durations: HashMap<String, f64> = HashMap::new();

    for span in &parse_result.spans {
        let event_name = match &span.event {
            crate::analyze_trace::types::EventSpanEvent::TraceEvent(event) => event.name(),
            _ => continue,
        };

        // Focus on file-level operations
        match event_name {
            "checkSourceFile" | "bindSourceFile" | "createSourceFile" => {
                // Use the event as a unique identifier for the file
                // In a real implementation, we'd extract the file path from args
                let file_key = format!("{}_{}", event_name, span.start);
                *file_durations.entry(file_key).or_insert(0.0) += span.duration;
            }
            _ => continue,
        }
    }

    // Calculate statistics
    let total_files = file_durations.len();

    if total_files == 0 {
        return Ok(FileStatistics {
            total_files: 0,
            total_duration: 0.0,
            mean_duration: 0.0,
            max_duration: 0.0,
            min_duration: 0.0,
        });
    }

    let durations: Vec<f64> = file_durations.values().copied().collect();
    let total_duration: f64 = f64::round(durations.iter().sum::<f64>() * 100.0) / 100.0;
    let mean_duration = f64::round((total_duration / total_files as f64) * 100.0) / 100.0;
    let max_duration =
        f64::round(durations.iter().copied().fold(f64::NEG_INFINITY, f64::max) * 100.0) / 100.0;
    let min_duration =
        f64::round(durations.iter().copied().fold(f64::INFINITY, f64::min) * 100.0) / 100.0;

    Ok(FileStatistics {
        total_files,
        total_duration,
        mean_duration,
        max_duration,
        min_duration,
    })
}
