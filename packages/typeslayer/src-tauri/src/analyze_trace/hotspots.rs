use crate::{
    analyze_trace::types::{AnalyzeTraceOptions, EventSpan, EventSpanEvent, HotSpot},
    validate::trace_json::TraceEvent,
};
use std::path::Path;

pub fn get_hotspots(
    hot_paths_tree: &EventSpan,
    options: &AnalyzeTraceOptions,
) -> Result<Vec<HotSpot>, String> {
    // `hot_paths_tree` is cloned ahead of time so that it can easily be sorted in-place without double-cloning.
    get_hotspots_worker(&mut hot_paths_tree.clone(), &mut None, options)
}

fn get_hotspots_worker(
    span: &mut EventSpan,
    current_file: &mut Option<String>,
    options: &AnalyzeTraceOptions,
) -> Result<Vec<HotSpot>, String> {
    let current_file_owned;

    // Update current file if this is a check event
    if let EventSpanEvent::TraceEvent(event) = &span.event {
        if event.cat() == "check" {
            // Try to extract path from various check events
            let path_opt = match event {
                TraceEvent::CheckExpression { args, .. } => args.path.as_deref(),
                TraceEvent::CheckVariableDeclaration { args, .. }
                | TraceEvent::CheckDeferredNode { args, .. } => Some(args.path.as_str()),
                TraceEvent::CheckSourceFile { args, .. }
                | TraceEvent::CheckSourceFileNodes { args, .. } => Some(args.path.as_str()),
                _ => None,
            };
            if let Some(path) = path_opt {
                current_file_owned = Some(path.to_string());
                *current_file = current_file_owned;
            }
        }
    }

    let mut children: Vec<HotSpot> = Vec::new();
    if !span.children.is_empty() {
        // Sort slow to fast
        let sorted_children = &mut span.children;
        sorted_children.sort_by(|a, b| b.duration.total_cmp(&a.duration));

        for child in sorted_children.iter_mut() {
            children.extend(get_hotspots_worker(child, current_file, options)?);
        }
    }

    match make_hot_frame(span, children) {
        Ok(hotspot) => Ok(vec![hotspot]),
        Err(children) => Ok(children),
    }
}

fn make_hot_frame(span: &EventSpan, children: Vec<HotSpot>) -> Result<HotSpot, Vec<HotSpot>> {
    if let EventSpanEvent::TraceEvent(event) = &span.event {
        use TraceEvent;

        match event {
            TraceEvent::CheckSourceFile { args, .. } => {
                let path = Path::new(&args.path).to_path_buf();

                Ok(HotSpot {
                    description: format!("Check file {}", path.display()),
                    start: span.start,
                    end: span.end,
                    duration: span.duration,
                    path: Some(path),
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
            TraceEvent::StructuredTypeRelatedTo { args, .. } => Ok(HotSpot {
                description: format!("Compare types {} and {}", args.source_id, args.target_id),
                start: span.start,
                end: span.end,
                duration: span.duration,
                children,
                types: Some(vec![args.source_id, args.target_id]),
                path: None,
                start_line: None,
                start_char: None,
                start_offset: None,
                end_line: None,
                end_char: None,
                end_offset: None,
            }),
            TraceEvent::GetVariancesWorker { args, .. } => Ok(HotSpot {
                description: format!("Determine variance of type {}", args.id),
                start: span.start,
                end: span.end,
                duration: span.duration,
                children,
                types: Some(vec![args.id]),
                path: None,
                start_line: None,
                start_char: None,
                start_offset: None,
                end_line: None,
                end_char: None,
                end_offset: None,
            }),
            TraceEvent::CheckExpression { args, .. } => {
                let path = args.path.as_ref().map(|p| Path::new(p).to_path_buf());

                Ok(HotSpot {
                    description: event.name().to_string(),
                    start: span.start,
                    end: span.end,
                    duration: span.duration,
                    path,
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
            TraceEvent::CheckVariableDeclaration { args, .. } => {
                let path = Some(Path::new(&args.path).to_path_buf());

                Ok(HotSpot {
                    description: event.name().to_string(),
                    start: span.start,
                    end: span.end,
                    duration: span.duration,
                    path,
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
            _ => Err(children),
        }
    } else {
        Err(children)
    }
}
