pub mod constants;
mod duplicate_node_modules;
mod hotspots;
mod node_module_paths;
mod spans;
mod types;

pub use spans::create_spans;
pub use types::*;

use crate::validate::trace_json::TraceEvent;
use crate::validate::types_json::TypesJsonSchema;
use serde_json;
use std::fs;
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
        return Err(format!("{} is not a directory", trace_dir));
    }

    // Read types.json
    let types_file_path = trace_dir_path.join("types.json");
    if !types_file_path.exists() {
        return Err(format!(
            "types.json must exist in {}. first run --generateTrace",
            trace_dir
        ));
    }
    let types_file_content = fs::read_to_string(&types_file_path)
        .map_err(|e| format!("Failed to read types.json: {}", e))?;
    let types_file: TypesJsonSchema = serde_json::from_str(&types_file_content)
        .map_err(|e| format!("Failed to parse types.json: {}", e))?;

    // Read trace.json
    let trace_file_path = trace_dir_path.join("trace.json");
    if !trace_file_path.exists() {
        return Err(format!(
            "trace.json must exist in {}. first run --generateTrace",
            trace_dir
        ));
    }
    let trace_file_content = fs::read_to_string(&trace_file_path)
        .map_err(|e| format!("Failed to read trace.json: {}", e))?;
    let trace_file: Vec<TraceEvent> = serde_json::from_str(&trace_file_content)
        .map_err(|e| format!("Failed to parse trace.json: {}", e))?;

    // Get node module paths
    let node_module_paths = node_module_paths::get_node_module_paths(&trace_file);

    // Create spans
    let parse_result = spans::create_spans(&trace_file)?;
    let hot_paths_tree = spans::create_span_tree(parse_result.clone(), &options);

    // Get hotspots
    let hot_spots = hotspots::get_hotspots(&hot_paths_tree, &types_file, &options)?;

    // Get duplicate packages
    let duplicate_packages =
        duplicate_node_modules::get_duplicate_node_modules(&node_module_paths)?;

    let result = AnalyzeTraceResult {
        node_module_paths,
        unterminated_events: parse_result.unclosed_stack.into_iter().rev().collect(),
        hot_spots,
        duplicate_packages,
    };

    // Write result to analyze-trace.json
    let output_path = trace_dir_path.join("analyze-trace.json");
    let output_json = serde_json::to_string_pretty(&result)
        .map_err(|e| format!("Failed to serialize result: {}", e))?;
    fs::write(&output_path, output_json)
        .map_err(|e| format!("Failed to write analyze-trace.json: {}", e))?;

    Ok(result)
}
