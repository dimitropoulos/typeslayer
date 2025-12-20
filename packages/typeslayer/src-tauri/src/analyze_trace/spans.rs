use crate::analyze_trace::types::{AnalyzeTraceOptions, EventSpan, EventSpanEvent, ParseResult};
use crate::validate::trace_json::{EventPhase, TraceEvent};

pub fn create_spans(trace_file: &[TraceEvent]) -> Result<ParseResult, String> {
    let mut unclosed_stack: Vec<TraceEvent> = Vec::new();
    let mut spans: Vec<EventSpan> = Vec::new();

    for event in trace_file {
        match event.ph() {
            EventPhase::Begin => {
                // Begin event
                unclosed_stack.push(event.clone());
            }
            EventPhase::End => {
                // End event
                let begin_event = unclosed_stack
                    .pop()
                    .ok_or_else(|| "Unmatched end event".to_string())?;
                let begin_ts = begin_event.common().ts;
                let end_ts = event.common().ts;
                spans.push(EventSpan {
                    event: EventSpanEvent::TraceEvent(begin_event),
                    start: begin_ts,
                    end: end_ts,
                    duration: end_ts - begin_ts,
                    children: Vec::new(),
                });
            }
            EventPhase::Complete => {
                // Treat events with a duration (dur) as complete events.
                if let Some(duration) = event.dur() {
                    let start = event.common().ts;
                    spans.push(EventSpan {
                        event: EventSpanEvent::TraceEvent(event.clone()),
                        start,
                        end: start + duration,
                        duration,
                        children: Vec::new(),
                    });
                }
            }
            EventPhase::Instant | EventPhase::Metadata => {
                // Instant or metadata - skip
                continue;
            }
        }
    }

    let first_span_start = spans.iter().map(|s| s.start).fold(f64::INFINITY, f64::min);
    let last_span_end = spans
        .iter()
        .map(|s| s.end)
        .fold(f64::NEG_INFINITY, f64::max);

    Ok(ParseResult {
        first_span_start,
        last_span_end,
        spans,
        unclosed_stack,
    })
}

pub fn create_span_tree(parse_result: ParseResult, options: &AnalyzeTraceOptions) -> EventSpan {
    let first_span_start = parse_result.first_span_start;
    let last_span_end = parse_result.last_span_end;
    let mut spans = parse_result.spans;
    let unclosed_stack = parse_result.unclosed_stack;

    // Add unclosed events to the spans
    for event in unclosed_stack.iter().rev() {
        let start = event.common().ts;
        let end = last_span_end;
        spans.push(EventSpan {
            event: EventSpanEvent::TraceEvent(event.clone()),
            start,
            end,
            duration: end - start,
            children: Vec::new(),
        });
    }

    // Sort spans by start time
    spans.sort_by(|a, b| a.start.partial_cmp(&b.start).unwrap());

    let mut root = EventSpan {
        event: EventSpanEvent::Root {
            name: "root".to_string(),
            cat: "program".to_string(),
        },
        start: first_span_start,
        end: last_span_end,
        duration: last_span_end - first_span_start,
        children: Vec::new(),
    };

    let mut stack: Vec<*mut EventSpan> = vec![&mut root as *mut EventSpan];

    for span in spans {
        // Find the parent in the stack
        let mut i = stack.len() - 1;
        while i > 0 {
            let curr = unsafe { &**stack.get(i).unwrap() };
            if curr.end > span.start {
                // Pop down to parent
                stack.truncate(i + 1);
                break;
            }
            i -= 1;
        }

        let threshold_duration = options.force_millis * 1000.0;
        let is_above_threshold = span.duration >= threshold_duration;

        let parent = unsafe { &mut **stack.get(i).unwrap() };
        let parent_duration = parent.end - parent.start;
        let is_significant_portion =
            span.duration >= parent_duration * options.min_span_parent_percentage;

        if is_above_threshold || is_significant_portion {
            parent.children.push(span);
            let last_idx = parent.children.len() - 1;
            let child_ptr = &mut parent.children[last_idx] as *mut EventSpan;
            stack.push(child_ptr);
        }
    }

    root
}
