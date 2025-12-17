use crate::analyze_trace::{EventSpan, EventSpanEvent, create_spans};
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

/// Build treemap data from trace events, grouping by file and summing
/// `checkSourceFile` durations derived from span reconstruction. This mirrors
/// Perfetto's per-file timings and avoids double-counting nested work.
pub fn build_treemap_from_trace(events: &[TraceEvent]) -> Result<Vec<TreemapNode>, String> {
    let parse_result = create_spans(events)?;
    let last_span_end = if parse_result.last_span_end.is_finite() {
        parse_result.last_span_end
    } else if let Some(last_event) = events.last() {
        last_event.common().ts
    } else {
        0.0
    };

    // Incorporate any unclosed spans by stretching them to the last observed
    // timestamp so they still contribute deterministically.
    let mut spans: Vec<EventSpan> = parse_result.spans;
    for event in parse_result.unclosed_stack.into_iter() {
        let start = event.common().ts;
        spans.push(EventSpan {
            event: EventSpanEvent::TraceEvent(event),
            start,
            end: last_span_end,
            duration: last_span_end - start,
            children: Vec::new(),
        });
    }

    let mut file_durations: HashMap<String, f64> = HashMap::new();

    for span in spans {
        let EventSpanEvent::TraceEvent(event) = span.event else {
            continue;
        };

        if let TraceEvent::CheckSourceFile { args, .. } = event {
            *file_durations.entry(args.path.clone()).or_insert(0.0) += span.duration;
        }
    }

    let mut nodes: Vec<TreemapNode> = file_durations
        .into_iter()
        .map(|(path, duration)| {
            let filename = path
                .rsplit('/')
                .next()
                .map(|s| s.to_string())
                .unwrap_or_else(|| path.clone());

            TreemapNode {
                name: filename,
                value: duration,
                path: Some(path),
                children: None,
            }
        })
        .collect();

    nodes.sort_by(|a, b| {
        b.value
            .partial_cmp(&a.value)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    Ok(nodes)
}
