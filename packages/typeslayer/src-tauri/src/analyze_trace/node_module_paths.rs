use crate::analyze_trace::types::NodeModulePaths;
use crate::validate::trace_json::TraceEvent;
use regex::Regex;
use std::sync::OnceLock;

fn package_name_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| {
        // Match node_modules/(package-name) or node_modules/@scope/package-name
        Regex::new(r"node_modules/((?:@[^/]+/)?[^/]+)").unwrap()
    })
}

pub fn get_node_module_paths(trace_json: &[TraceEvent]) -> NodeModulePaths {
    let mut node_module_paths: NodeModulePaths = NodeModulePaths::new();
    let regex = package_name_regex();

    for event in trace_json {
        if let TraceEvent::FindSourceFile { args, .. } = event {
            for captures in regex.captures_iter(&args.file_name) {
                if let Some(package_name_match) = captures.get(1) {
                    let package_name = package_name_match.as_str().to_string();
                    let package_path = &args.file_name[..captures.get(0).unwrap().end()];

                    node_module_paths
                        .entry(package_name)
                        .or_default()
                        .push(package_path.to_string());
                }
            }
        }
    }

    // Deduplicate paths for each package
    for paths in node_module_paths.values_mut() {
        paths.sort();
        paths.dedup();
    }

    node_module_paths
}
