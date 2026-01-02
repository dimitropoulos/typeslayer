use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use strum::VariantArray;
use ts_rs::TS;

use crate::{
    analytics::{
        TypeSlayerEvent,
        metadata::{EventMetadata, create_event_metadata},
    },
    app_data::AppData,
    type_graph::{LinkKind, LinkKindData},
    validate::types_json::Flag,
};

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct StrippedDirectionData {
    pub max: usize,
    pub count: usize,
}

/// Stats for a specific link kind: ordered list of (target_id, [source_ids])
/// Ordered by number of sources (most connected first)
#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct StrippedLinkKindData {
    pub by_target: StrippedDirectionData,
    pub by_source: StrippedDirectionData,
    pub link_count: usize,
}

// convert LinkKindData to StrippedLinkKindData
impl From<&LinkKindData> for StrippedLinkKindData {
    fn from(link_kind_data: &LinkKindData) -> Self {
        Self {
            by_target: StrippedDirectionData {
                max: link_kind_data.by_target.max,
                count: link_kind_data.by_target.count,
            },
            by_source: StrippedDirectionData {
                max: link_kind_data.by_source.max,
                count: link_kind_data.by_source.count,
            },
            link_count: link_kind_data.link_count,
        }
    }
}

#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EventTypeGraphSuccessData {
    #[ts(type = "number")]
    pub duration: u64,
    pub node_count: usize,
    pub link_count: usize,
    pub link_kind_data_by_kind: IndexMap<LinkKind, StrippedLinkKindData>,
    pub type_kinds: Vec<(Vec<Flag>, usize)>,
}

#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EventTypeGraphSuccess {
    #[ts(type = "\"type_graph_success\"")]
    pub name: &'static str,
    #[serde(flatten)]
    pub metadata: EventMetadata,
    pub data: EventTypeGraphSuccessData,
}

pub struct EventTypeGraphSuccessArgs {
    pub duration: u64,
}

impl TypeSlayerEvent for EventTypeGraphSuccess {
    type Args = EventTypeGraphSuccessArgs;

    fn event_id() -> &'static str {
        "type_graph_success"
    }

    fn description() -> &'static str {
        "type-graph completed successfully"
    }

    fn example() -> Self {
        Self {
            name: EventTypeGraphSuccess::event_id(),
            metadata: EventMetadata::example(),
            data: EventTypeGraphSuccessData {
                duration: 3000,
                node_count: 100,
                link_count: 250,
                link_kind_data_by_kind: LinkKind::VARIANTS
                    .iter()
                    .map(|kind| (kind.clone(), StrippedLinkKindData::default()))
                    .collect(),
                type_kinds: vec![
                    (vec![Flag::Object], 49801),
                    (vec![Flag::Union], 17939),
                    (vec![Flag::StringLiteral], 9087),
                    (vec![Flag::TypeParameter, Flag::IncludesMissingType], 5399),
                    (vec![Flag::Intersection], 4795),
                    (vec![Flag::Conditional, Flag::IncludesEmptyObject], 2748),
                    (vec![Flag::IndexedAccess, Flag::IncludesWildcard], 999),
                    (vec![Flag::TemplateLiteral], 554),
                    (vec![Flag::NumberLiteral], 242),
                ],
            },
        }
    }

    async fn create(app_data: &AppData, args: Self::Args) -> Self {
        // panic if there's no app_data.analyze_trace
        let type_graph = app_data
            .type_graph
            .as_ref()
            .expect("type_graph must be Some to create EventAnalyzeTraceSuccess");

        EventTypeGraphSuccess {
            name: EventTypeGraphSuccess::event_id(),
            metadata: create_event_metadata(app_data).await,
            data: EventTypeGraphSuccessData {
                duration: args.duration,
                node_count: type_graph.node_count,
                link_count: type_graph.link_count,
                link_kind_data_by_kind: type_graph
                    .link_kind_data_by_kind
                    .iter()
                    .map(|(kind, link_kind_data)| {
                        (kind.clone(), StrippedLinkKindData::from(link_kind_data))
                    })
                    .collect(),
                type_kinds: type_graph
                    .type_kinds
                    .iter()
                    .map(|(flags, count)| (flags.clone(), *count))
                    .collect(),
            },
        }
    }
}
