use crate::validate::trace_json::TraceEvent;
use std::collections::HashMap;
use strum::IntoEnumIterator;
use strum_macros::EnumIter;

#[derive(
    Eq, Hash, PartialEq, Clone, Copy, Debug, serde::Deserialize, serde::Serialize, EnumIter,
)]
pub enum DepthLimitKind {
    #[serde(rename = "checkCrossProductUnion_DepthLimit")]
    CheckCrossProductUnion,
    #[serde(rename = "checkTypeRelatedTo_DepthLimit")]
    CheckTypeRelatedTo,
    #[serde(rename = "getTypeAtFlowNode_DepthLimit")]
    GetTypeAtFlowNode,
    #[serde(rename = "instantiateType_DepthLimit")]
    InstantiateType,
    #[serde(rename = "recursiveTypeRelatedTo_DepthLimit")]
    RecursiveTypeRelatedTo,
    #[serde(rename = "removeSubtypes_DepthLimit")]
    RemoveSubtypes,
    #[serde(rename = "traceUnionsOrIntersectionsTooLarge_DepthLimit")]
    TraceUnionsOrIntersectionsTooLarge,
    #[serde(rename = "typeRelatedToDiscriminatedType_DepthLimit")]
    TypeRelatedToDiscriminatedType,
}

pub fn create_depth_limits(
    trace_file: &Vec<TraceEvent>,
) -> HashMap<DepthLimitKind, Vec<TraceEvent>> {
    let mut depth_limits: HashMap<DepthLimitKind, Vec<TraceEvent>> = HashMap::new();

    fn kind_from_event_name(name: &str) -> Option<DepthLimitKind> {
        for kind in DepthLimitKind::iter() {
            if let Ok(serialized) = serde_plain::to_string(&kind) {
                if serialized == name {
                    return Some(kind);
                }
            }
        }
        None
    }

    for kind in DepthLimitKind::iter() {
        depth_limits.insert(kind, Vec::new());
    }

    for ev in trace_file.iter() {
        if let Some(kind) = kind_from_event_name(ev.name.as_str()) {
            if let Some(vec) = depth_limits.get_mut(&kind) {
                vec.push(ev.clone());
            }
        }
    }

    // Helpers to extract numeric args
    fn num_arg(ev: &TraceEvent, key: &str) -> f64 {
        match ev.args.get(key) {
            Some(serde_json::Value::Number(n)) => n.as_f64().unwrap_or(0.0),
            _ => 0.0,
        }
    }

    // Sort per bucket based on noted criteria
    if let Some(v) = depth_limits.get_mut(&DepthLimitKind::CheckCrossProductUnion) {
        v.sort_by(|a, b| {
            num_arg(b, "size")
                .partial_cmp(&num_arg(a, "size"))
                .unwrap_or(std::cmp::Ordering::Equal)
        });
    }
    if let Some(v) = depth_limits.get_mut(&DepthLimitKind::CheckTypeRelatedTo) {
        v.sort_by(|a, b| {
            num_arg(b, "depth")
                .partial_cmp(&num_arg(a, "depth"))
                .unwrap_or(std::cmp::Ordering::Equal)
        });
    }
    if let Some(v) = depth_limits.get_mut(&DepthLimitKind::GetTypeAtFlowNode) {
        v.sort_by(|a, b| {
            num_arg(b, "flowId")
                .partial_cmp(&num_arg(a, "flowId"))
                .unwrap_or(std::cmp::Ordering::Equal)
        });
    }
    if let Some(v) = depth_limits.get_mut(&DepthLimitKind::InstantiateType) {
        v.sort_by(|a, b| {
            num_arg(b, "instantiationDepth")
                .partial_cmp(&num_arg(a, "instantiationDepth"))
                .unwrap_or(std::cmp::Ordering::Equal)
        });
    }
    if let Some(v) = depth_limits.get_mut(&DepthLimitKind::RecursiveTypeRelatedTo) {
        v.sort_by(|a, b| {
            num_arg(b, "depth")
                .partial_cmp(&num_arg(a, "depth"))
                .unwrap_or(std::cmp::Ordering::Equal)
        });
    }

    // RemoveSubtypes: not sorted

    if let Some(v) = depth_limits.get_mut(&DepthLimitKind::TraceUnionsOrIntersectionsTooLarge) {
        v.sort_by(|a, b| {
            let a_prod = num_arg(a, "sourceSize") * num_arg(a, "targetSize");
            let b_prod = num_arg(b, "sourceSize") * num_arg(b, "targetSize");
            b_prod
                .partial_cmp(&a_prod)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
    }
    if let Some(v) = depth_limits.get_mut(&DepthLimitKind::TypeRelatedToDiscriminatedType) {
        v.sort_by(|a, b| {
            num_arg(b, "numCombinations")
                .partial_cmp(&num_arg(a, "numCombinations"))
                .unwrap_or(std::cmp::Ordering::Equal)
        });
    }

    depth_limits
}
