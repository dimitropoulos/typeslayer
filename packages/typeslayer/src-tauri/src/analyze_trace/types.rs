use crate::{analyze_trace::depth_limits::DepthLimitKind, validate::trace_json::TraceEvent};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyzeTraceOptions {
    pub force_millis: f64,
    pub skip_millis: f64,
    pub expand_types: bool,
    pub min_span_parent_percentage: f64,
    pub import_expression_threshold: u32,
}

impl Default for AnalyzeTraceOptions {
    fn default() -> Self {
        Self {
            force_millis: 500.0,
            skip_millis: 100.0,
            expand_types: true,
            min_span_parent_percentage: 0.6,
            import_expression_threshold: 10,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventSpan {
    pub event: EventSpanEvent,
    pub start: f64,
    pub end: f64,
    pub duration: f64,
    pub children: Vec<EventSpan>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum EventSpanEvent {
    Root { name: String, cat: String },
    TraceEvent(TraceEvent),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParseResult {
    pub first_span_start: f64,
    pub last_span_end: f64,
    pub spans: Vec<EventSpan>,
    pub unclosed_stack: Vec<TraceEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HotSpot {
    pub description: String,
    #[serde(rename = "timeMs")]
    pub time_ms: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub types: Option<Vec<i64>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub start_line: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub start_char: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub start_offset: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end_line: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end_char: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end_offset: Option<i64>,
    pub children: Vec<HotSpot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicatedPackageInstance {
    pub path: String,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicatedPackage {
    pub name: String,
    pub instances: Vec<DuplicatedPackageInstance>,
}

pub type NodeModulePaths = HashMap<String, Vec<String>>;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyzeTraceResult {
    pub depth_limits: HashMap<DepthLimitKind, Vec<TraceEvent>>,
    pub duplicate_packages: Vec<DuplicatedPackage>,
    pub hot_spots: Vec<HotSpot>,
    pub unterminated_events: Vec<TraceEvent>,
    pub node_module_paths: NodeModulePaths,
}
