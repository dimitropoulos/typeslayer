pub mod constants;
mod depth_limits;
mod duplicate_node_modules;
mod hotspots;
mod node_module_paths;
mod spans;
mod types;

pub use depth_limits::DepthLimitKind;
pub use spans::create_spans;
pub use types::*;

use crate::analyze_trace::constants::ANALYZE_TRACE_FILENAME;
use crate::analyze_trace::depth_limits::create_depth_limits;
use crate::analyze_trace::duplicate_node_modules::get_duplicate_node_modules;
use crate::analyze_trace::hotspots::get_hotspots;
use crate::analyze_trace::node_module_paths::get_node_module_paths;
use crate::analyze_trace::spans::create_span_tree;
use crate::validate::trace_json::{TRACE_JSON_FILENAME, TraceEvent};
use std::fs::{self, File};
use std::io::{self, BufReader};
use std::path::Path;

pub fn validate_options(options: &AnalyzeTraceOptions) -> Result<(), String> {
    if options.force_millis < options.skip_millis {
        return Err("forceMillis cannot be less than skipMillis".to_string());
    }
    Ok(())
}

pub fn analyze_trace(
    trace_dir: &str,
    options: Option<AnalyzeTraceOptions>,
) -> Result<AnalyzeTraceResult, String> {
    let options = options.unwrap_or_default();
    validate_options(&options)?;

    // Validate trace directory and read files
    let trace_dir_path = Path::new(trace_dir);
    if !trace_dir_path.is_dir() {
        return Err(format!("{trace_dir} is not a directory",));
    }

    // Read trace.json
    let trace_file_path = trace_dir_path.join(TRACE_JSON_FILENAME);
    let trace_file = match File::open(&trace_file_path) {
        Ok(f) => f,
        Err(e) if e.kind() == io::ErrorKind::NotFound => {
            return Err(format!(
                "trace.json must exist in {trace_dir}. first run --generateTrace",
            ));
        }
        Err(e) => return Err(format!("Failed to open trace.json: {e}")),
    };
    let trace_file: Vec<TraceEvent> = serde_json::from_reader(BufReader::new(trace_file))
        .map_err(|e| format!("Failed to parse trace.json: {e}"))?;

    let node_module_paths = get_node_module_paths(&trace_file);
    let parse_result = create_spans(&trace_file)?;
    let unterminated_events = parse_result.unclosed_stack.iter().rev().cloned().collect();
    let hot_paths_tree = create_span_tree(parse_result, &options);
    let hot_spots = get_hotspots(&hot_paths_tree)?;
    let duplicate_packages = get_duplicate_node_modules(&node_module_paths)?;
    let depth_limits = create_depth_limits(&trace_file);

    let result = AnalyzeTraceResult {
        depth_limits,
        duplicate_packages,
        hot_spots,
        unterminated_events,
        node_module_paths,
    };

    // Write result to analyze-trace.json
    let output_path = trace_dir_path.join(ANALYZE_TRACE_FILENAME);
    let output_json = serde_json::to_string_pretty(&result)
        .map_err(|e| format!("Failed to serialize result: {e}"))?;
    fs::write(&output_path, output_json)
        .map_err(|e| format!("Failed to write analyze-trace.json: {e}"))?;

    Ok(result)
}
