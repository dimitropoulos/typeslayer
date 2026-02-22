// This module exports TypeScript types for analytics events
// Run with: cargo test export_types

#[cfg(test)]
mod tests {
    use crate::analytics::{
        event_analyze_trace_fail::*, event_analyze_trace_success::*, event_app_started_fail::*,
        event_app_started_success::*, event_generate_trace_fail::*,
        event_generate_trace_success::*, event_type_graph_fail::*, event_type_graph_success::*,
    };
    use ts_rs::{Config, TS};

    #[test]
    fn export_types() {
        let cfg = Config::from_env();
        std::fs::create_dir_all(cfg.out_dir()).unwrap();

        println!("Exporting types to: {}", cfg.out_dir().display());

        // Export all event types
        EventAnalyzeTraceFail::export_all(&cfg).expect("Failed to export EventAnalyzeTraceFail");
        EventAnalyzeTraceSuccess::export_all(&cfg)
            .expect("Failed to export EventAnalyzeTraceSuccess");
        EventAppStartedFail::export_all(&cfg).expect("Failed to export EventAppStartedFail");
        EventAppStartedSuccess::export_all(&cfg).expect("Failed to export EventAppStartedSuccess");
        EventGenerateTraceFail::export_all(&cfg).expect("Failed to export EventGenerateTraceFail");
        EventGenerateTraceSuccess::export_all(&cfg)
            .expect("Failed to export EventGenerateTraceSuccess");
        EventTypeGraphFail::export_all(&cfg).expect("Failed to export EventTypeGraphFail");
        EventTypeGraphSuccess::export_all(&cfg).expect("Failed to export EventTypeGraphSuccess");

        println!("Successfully exported all types!");
    }
}
