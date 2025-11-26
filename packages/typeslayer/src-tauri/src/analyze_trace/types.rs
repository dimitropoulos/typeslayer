use crate::validate::trace_json::TraceEvent;
use crate::validate::types_json::ResolvedType;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub type Microseconds = f64;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyzeTraceOptions {
    #[serde(rename = "forceMillis")]
    pub force_millis: f64,
    #[serde(rename = "skipMillis")]
    pub skip_millis: f64,
    #[serde(rename = "expandTypes")]
    pub expand_types: bool,
    #[serde(rename = "minSpanParentPercentage")]
    pub min_span_parent_percentage: f64,
    #[serde(rename = "importExpressionThreshold")]
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
pub struct ParseResult {
    #[serde(rename = "firstSpanStart")]
    pub first_span_start: f64,
    #[serde(rename = "lastSpanEnd")]
    pub last_span_end: f64,
    pub spans: Vec<EventSpan>,
    #[serde(rename = "unclosedStack")]
    pub unclosed_stack: Vec<TraceEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HotType {
    #[serde(rename = "resolvedType")]
    pub resolved_type: ResolvedType,
    pub children: Vec<HotType>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HotSpot {
    pub description: String,
    #[serde(rename = "timeMs")]
    pub time_ms: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub types: Option<Vec<HotType>>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "startLine")]
    pub start_line: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "startChar")]
    pub start_char: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "startOffset")]
    pub start_offset: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "endLine")]
    pub end_line: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "endChar")]
    pub end_char: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "endOffset")]
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
pub struct AnalyzeTraceResult {
    #[serde(rename = "nodeModulePaths")]
    pub node_module_paths: NodeModulePaths,
    #[serde(rename = "unterminatedEvents")]
    pub unterminated_events: Vec<TraceEvent>,
    #[serde(rename = "hotSpots")]
    pub hot_spots: Vec<HotSpot>,
    #[serde(rename = "duplicatePackages")]
    pub duplicate_packages: Vec<DuplicatedPackage>,
}
