pub mod constants;
mod duplicate_node_modules;
mod hotspots;
mod node_module_paths;
mod spans;
mod types;

pub use spans::create_spans;
pub use types::*;

use crate::analyze_trace::constants::ANALYZE_TRACE_FILENAME;
use crate::validate::trace_json::{TRACE_JSON_FILENAME, TraceEvent};
use crate::validate::types_json::{TYPES_JSON_FILENAME, TypesJsonSchema};
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

    // Read trace.json
    let trace_file_path = trace_dir_path.join(TRACE_JSON_FILENAME);
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
    let hot_spots = hotspots::get_hotspots(&hot_paths_tree, &options)?;

    // Get duplicate packages
    let duplicate_packages =
        duplicate_node_modules::get_duplicate_node_modules(&node_module_paths)?;

    // Group depth limit events by event name via helper
    let depth_limits = create_depth_limits(&trace_file);

    let result = AnalyzeTraceResult {
        node_module_paths,
        unterminated_events: parse_result.unclosed_stack.into_iter().rev().collect(),
        hot_spots,
        duplicate_packages,
        depth_limits,
    };

    // Write result to analyze-trace.json
    let output_path = trace_dir_path.join(ANALYZE_TRACE_FILENAME);
    let output_json = serde_json::to_string_pretty(&result)
        .map_err(|e| format!("Failed to serialize result: {}", e))?;
    fs::write(&output_path, output_json)
        .map_err(|e| format!("Failed to write analyze-trace.json: {}", e))?;

    Ok(result)
}

use std::collections::HashMap;
fn create_depth_limits(trace_file: &Vec<TraceEvent>) -> HashMap<String, Vec<TraceEvent>> {
    let depth_limit_names = [
        "checkCrossProductUnion_DepthLimit", // sort by args.size
        "checkTypeRelatedTo_DepthLimit",     // sort by args.depth
        "getTypeAtFlowNode_DepthLimit",      // sort by args.flowId
        "instantiateType_DepthLimit",        // sort by args.instantiationDepth
        "recursiveTypeRelatedTo_DepthLimit", // sort by args.depth
        "removeSubtypes_DepthLimit",         // not sorted
        "traceUnionsOrIntersectionsTooLarge_DepthLimit", // sort by args.sourceSize * args.targetSize
        "typeRelatedToDiscriminatedType_DepthLimit",     // sort by args.numCombinations
    ];

    let mut depth_limits: HashMap<String, Vec<TraceEvent>> = HashMap::new();
    for name in depth_limit_names.iter() {
        depth_limits.insert(name.to_string(), Vec::new());
    }

    let mut depth_limits = trace_file.iter().fold(depth_limits, |mut acc, ev| {
        if depth_limit_names.contains(&ev.name.as_str()) {
            if let Some(vec) = acc.get_mut(&ev.name) {
                vec.push(ev.clone());
            }
        }
        acc
    });

    // Helpers to extract numeric args
    fn num_arg(ev: &TraceEvent, key: &str) -> f64 {
        match ev.args.get(key) {
            Some(serde_json::Value::Number(n)) => n.as_f64().unwrap_or(0.0),
            _ => 0.0,
        }
    }

    // Sort per bucket based on noted criteria
    if let Some(v) = depth_limits.get_mut("checkCrossProductUnion_DepthLimit") {
        v.sort_by(|a, b| {
            num_arg(b, "size")
                .partial_cmp(&num_arg(a, "size"))
                .unwrap_or(std::cmp::Ordering::Equal)
        });
    }
    if let Some(v) = depth_limits.get_mut("checkTypeRelatedTo_DepthLimit") {
        v.sort_by(|a, b| {
            num_arg(b, "depth")
                .partial_cmp(&num_arg(a, "depth"))
                .unwrap_or(std::cmp::Ordering::Equal)
        });
    }
    if let Some(v) = depth_limits.get_mut("getTypeAtFlowNode_DepthLimit") {
        v.sort_by(|a, b| {
            num_arg(b, "flowId")
                .partial_cmp(&num_arg(a, "flowId"))
                .unwrap_or(std::cmp::Ordering::Equal)
        });
    }
    if let Some(v) = depth_limits.get_mut("instantiateType_DepthLimit") {
        v.sort_by(|a, b| {
            num_arg(b, "instantiationDepth")
                .partial_cmp(&num_arg(a, "instantiationDepth"))
                .unwrap_or(std::cmp::Ordering::Equal)
        });
    }
    if let Some(v) = depth_limits.get_mut("recursiveTypeRelatedTo_DepthLimit") {
        v.sort_by(|a, b| {
            num_arg(b, "depth")
                .partial_cmp(&num_arg(a, "depth"))
                .unwrap_or(std::cmp::Ordering::Equal)
        });
    }

    // removeSubtypes_DepthLimit: not sorted

    if let Some(v) = depth_limits.get_mut("traceUnionsOrIntersectionsTooLarge_DepthLimit") {
        v.sort_by(|a, b| {
            let a_prod = num_arg(a, "sourceSize") * num_arg(a, "targetSize");
            let b_prod = num_arg(b, "sourceSize") * num_arg(b, "targetSize");
            b_prod
                .partial_cmp(&a_prod)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
    }
    if let Some(v) = depth_limits.get_mut("typeRelatedToDiscriminatedType_DepthLimit") {
        v.sort_by(|a, b| {
            num_arg(b, "numCombinations")
                .partial_cmp(&num_arg(a, "numCombinations"))
                .unwrap_or(std::cmp::Ordering::Equal)
        });
    }

    depth_limits
}
