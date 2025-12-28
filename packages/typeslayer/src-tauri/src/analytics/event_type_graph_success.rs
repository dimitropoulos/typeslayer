use std::collections::HashMap;

use serde::Serialize;
use tracing::debug;

use crate::{
    analytics::{
        TypeSlayerEvent,
        metadata::{EventMetadata, create_event_metadata},
    },
    app_data::AppData,
    type_graph::{LinkKind, NodeStatKind},
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventTypeGraphSuccessData {
    pub duration: u64,
    pub link_counts: HashMap<LinkKind, usize>,
    pub total_links: usize,
    pub node_stat_counts: HashMap<NodeStatKind, usize>,
    pub total_nodes: usize,
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
                link_counts: LinkKind::new_counts_map(),
                total_links: 42,
                node_stat_counts: NodeStatKind::new_counts_map(),
                total_nodes: 100,
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
                link_counts: type_graph.stats.link_counts.clone(),
                total_links: type_graph.links.len(),
                node_stat_counts: type_graph.calculate_node_stat_counts(),
                total_nodes: type_graph.nodes,
            },
        };
        debug!("[event] [type_graph_success] created event: {:?}", event);
        event
    }
}
