// This module exports TypeScript types for analytics events
// Run with: cargo test export_types

#[cfg(test)]
mod tests {
    use crate::analytics::{
        event_analyze_trace_fail::*, event_analyze_trace_success::*, event_app_started_fail::*,
        event_app_started_success::*, event_generate_trace_fail::*,
        event_generate_trace_success::*, event_type_graph_fail::*, event_type_graph_success::*,
    };
    use ts_rs::TS;

    #[test]
    fn export_types() {
        use std::env;
        use std::path::Path;

        // Get the workspace root
        let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
        let workspace_root = Path::new(&manifest_dir)
            .parent() // src-tauri -> typeslayer
            .unwrap()
            .parent() // typeslayer -> packages
            .unwrap()
            .parent() // packages -> workspace root
            .unwrap();

        let out_dir = workspace_root.join("packages/rust-types");
        std::fs::create_dir_all(&out_dir).unwrap();

        println!("Exporting types to: {}", out_dir.display());

        // Export all event types
        EventAnalyzeTraceFail::export_all_to(&out_dir)
            .expect("Failed to export EventAnalyzeTraceFail");
        EventAnalyzeTraceSuccess::export_all_to(&out_dir)
            .expect("Failed to export EventAnalyzeTraceSuccess");
        EventAppStartedFail::export_all_to(&out_dir).expect("Failed to export EventAppStartedFail");
        EventAppStartedSuccess::export_all_to(&out_dir)
            .expect("Failed to export EventAppStartedSuccess");
        EventGenerateTraceFail::export_all_to(&out_dir)
            .expect("Failed to export EventGenerateTraceFail");
        EventGenerateTraceSuccess::export_all_to(&out_dir)
            .expect("Failed to export EventGenerateTraceSuccess");
        EventTypeGraphFail::export_all_to(&out_dir).expect("Failed to export EventTypeGraphFail");
        EventTypeGraphSuccess::export_all_to(&out_dir)
            .expect("Failed to export EventTypeGraphSuccess");

        println!("Successfully exported all types!");
    }
}
