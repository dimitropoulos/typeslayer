use std::collections::HashMap;

use serde::Serialize;
use tracing::debug;

use crate::{
    analytics::{
        TypeSlayerEvent,
        metadata::{EventMetadata, create_event_metadata},
    },
    app_data::AppData,
    type_graph::{CountAndMax, LinkKind, NodeStatKind},
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventTypeGraphSuccessData {
    pub duration: u64,

    pub node_count: usize,
    pub node_stats_by_type: HashMap<NodeStatKind, CountAndMax>,

    pub link_count: usize,
    pub link_stats_by_type: HashMap<LinkKind, CountAndMax>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventTypeGraphSuccess {
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
                node_stats_by_type: NodeStatKind::new_count_and_max_map(),

                link_count: 42,
                link_stats_by_type: LinkKind::new_count_and_max_map(),
            },
        }
    }

    async fn create(app_data: &AppData, args: Self::Args) -> Self {
        // panic if there's no app_data.analyze_trace
        let type_graph = app_data
            .type_graph
            .as_ref()
            .expect("type_graph must be Some to create EventAnalyzeTraceSuccess");

        let event = EventTypeGraphSuccess {
            name: EventTypeGraphSuccess::event_id(),
            metadata: create_event_metadata(app_data).await,
            data: EventTypeGraphSuccessData {
                duration: args.duration,

                node_count: type_graph.nodes,
                node_stats_by_type: type_graph.calculate_node_stat_count_and_max(),

                link_count: type_graph.links.len(),
                link_stats_by_type: type_graph.calculate_link_count_and_max(),
            },
        };
        debug!("[event] [type_graph_success] created event: {:?}", event);
        event
    }
}
