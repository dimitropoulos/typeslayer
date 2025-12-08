use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{AppHandle, State};

use crate::app_data::AppData;
use crate::validate::types_json::TypesJsonSchema;
use crate::validate::utils::TypeId;

pub const TYPE_GRAPH_FILENAME: &str = "type-graph.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphNode {
    pub id: TypeId,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum EdgeKind {
    // one to many
    AliasTypeArgument,
    Intersection,
    TypeArgument,
    Union,

    // one to one
    Instantiated,
    SubstitutionBase,
    Constraint,
    IndexedAccessObject,
    IndexedAccessIndex,
    ConditionalCheck,
    ConditionalExtends,
    ConditionalTrue,
    ConditionalFalse,
    Keyof,
    EvolvingArrayElement,
    EvolvingArrayFinal,
    ReverseMappedSource,
    ReverseMappedMapped,
    ReverseMappedConstraint,
    Alias,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphLink {
    pub source: TypeId,
    pub target: TypeId,
    pub kind: EdgeKind,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphStats {
    pub count: HashMap<String, usize>,
}

/// Stats for a specific edge kind: ordered list of (target_id, [source_ids])
/// Ordered by number of sources (most connected first)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EdgeStats {
    /// Largest source count across entries
    pub max: usize,
    /// Array of [target_id, [source_ids]] tuples, sorted by source count descending
    pub links: Vec<(TypeId, Vec<TypeId>, Option<String>)>,
}

#[derive(Debug, Default, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TypeGraph {
    nodes: HashMap<TypeId, GraphNode>,
    links: Vec<GraphLink>,
    edge_stats: HashMap<String, EdgeStats>,
    node_stats: NodeStats,
}

impl TypeGraph {
    /// Return a human-readable type name similar to frontend's getHumanReadableName
    fn human_readable_name(t: &crate::validate::types_json::ResolvedType) -> String {
        // Literal types: prefer display string when available
        // Treat single-flag types with a display as literals
        let is_literal = t.flags.len() == 1;
        if is_literal {
            if let Some(d) = &t.display {
                if !d.is_empty() {
                    return d.clone();
                }
            }
        }

        if let Some(s) = &t.symbol_name {
            return s.clone();
        }
        if let Some(i) = &t.intrinsic_name {
            return format!("{}", i);
        }
        "<anonymous>".to_string()
    }

    pub fn from_types(types: &TypesJsonSchema) -> Self {
        let mut graph = TypeGraph::default();

        // First pass: create nodes
        for t in types.iter() {
            let id = t.id;
            let name = TypeGraph::human_readable_name(t);
            graph.nodes.entry(id).or_insert(GraphNode { id, name });
        }

        // Helper to add edge if both endpoints exist
        let mut add_edge = |source: TypeId, target: TypeId, kind: EdgeKind| {
            if graph.nodes.contains_key(&source) && graph.nodes.contains_key(&target) {
                graph.links.push(GraphLink {
                    source,
                    target,
                    kind,
                });
            }
        };

        // Second pass: add links for supported relations
        for t in types.iter() {
            let src = t.id;

            if let Some(union) = &t.union_types {
                for &target in union.iter() {
                    add_edge(src, target, EdgeKind::Union);
                }
            }

            if let Some(type_args) = &t.type_arguments {
                for &target in type_args.iter() {
                    add_edge(src, target, EdgeKind::TypeArgument);
                }
            }

            if let Some(inst) = t.instantiated_type {
                add_edge(src, inst, EdgeKind::Instantiated);
            }

            // Additional single TypeId relationships
            if let Some(target) = t.substitution_base_type {
                add_edge(src, target, EdgeKind::SubstitutionBase);
            }
            if let Some(target) = t.constraint_type {
                add_edge(src, target, EdgeKind::Constraint);
            }
            if let Some(target) = t.indexed_access_object_type {
                add_edge(src, target, EdgeKind::IndexedAccessObject);
            }
            if let Some(target) = t.indexed_access_index_type {
                add_edge(src, target, EdgeKind::IndexedAccessIndex);
            }
            if let Some(target) = t.conditional_check_type {
                add_edge(src, target, EdgeKind::ConditionalCheck);
            }
            if let Some(target) = t.conditional_extends_type {
                add_edge(src, target, EdgeKind::ConditionalExtends);
            }
            if let Some(target) = t.conditional_true_type {
                add_edge(src, target, EdgeKind::ConditionalTrue);
            }
            if let Some(target) = t.conditional_false_type {
                add_edge(src, target, EdgeKind::ConditionalFalse);
            }
            if let Some(target) = t.keyof_type {
                add_edge(src, target, EdgeKind::Keyof);
            }
            if let Some(target) = t.evolving_array_element_type {
                add_edge(src, target, EdgeKind::EvolvingArrayElement);
            }
            if let Some(target) = t.evolving_array_final_type {
                add_edge(src, target, EdgeKind::EvolvingArrayFinal);
            }
            if let Some(target) = t.reverse_mapped_source_type {
                add_edge(src, target, EdgeKind::ReverseMappedSource);
            }
            if let Some(target) = t.reverse_mapped_mapped_type {
                add_edge(src, target, EdgeKind::ReverseMappedMapped);
            }
            if let Some(target) = t.reverse_mapped_constraint_type {
                add_edge(src, target, EdgeKind::ReverseMappedConstraint);
            }
            if let Some(target) = t.alias_type {
                add_edge(src, target, EdgeKind::Alias);
            }

            // Array relationships
            if let Some(alias_args) = &t.alias_type_arguments {
                for &target in alias_args.iter() {
                    add_edge(src, target, EdgeKind::AliasTypeArgument);
                }
            }
            if let Some(intersection) = &t.intersection_types {
                for &target in intersection.iter() {
                    add_edge(src, target, EdgeKind::Intersection);
                }
            }
        }

        graph.calculate_edge_stats(types);
        graph.calculate_node_stats(types);

        graph
    }

    /// Build a map from type id -> optional path (mimics extractPath)
    fn build_path_map(types: &TypesJsonSchema) -> HashMap<TypeId, Option<String>> {
        let mut path_map: HashMap<TypeId, Option<String>> = HashMap::new();
        for t in types.iter() {
            let p = t
                .first_declaration
                .as_ref()
                .map(|l| l.path.clone())
                .or_else(|| t.reference_location.as_ref().map(|l| l.path.clone()))
                .or_else(|| t.destructuring_pattern.as_ref().map(|l| l.path.clone()));
            path_map.insert(t.id, p);
        }
        path_map
    }

    fn calculate_edge_stats(&mut self, types: &TypesJsonSchema) {
        // Group links by kind, then by target
        let mut kind_maps: HashMap<String, HashMap<TypeId, Vec<TypeId>>> = HashMap::new();

        for link in &self.links {
            let kind_str = match link.kind {
                EdgeKind::Union => "union",
                EdgeKind::TypeArgument => "typeArgument",
                EdgeKind::Instantiated => "instantiated",
                EdgeKind::SubstitutionBase => "substitutionBase",
                EdgeKind::Constraint => "constraint",
                EdgeKind::IndexedAccessObject => "indexedAccessObject",
                EdgeKind::IndexedAccessIndex => "indexedAccessIndex",
                EdgeKind::ConditionalCheck => "conditionalCheck",
                EdgeKind::ConditionalExtends => "conditionalExtends",
                EdgeKind::ConditionalTrue => "conditionalTrue",
                EdgeKind::ConditionalFalse => "conditionalFalse",
                EdgeKind::Keyof => "keyof",
                EdgeKind::EvolvingArrayElement => "evolvingArrayElement",
                EdgeKind::EvolvingArrayFinal => "evolvingArrayFinal",
                EdgeKind::ReverseMappedSource => "reverseMappedSource",
                EdgeKind::ReverseMappedMapped => "reverseMappedMapped",
                EdgeKind::ReverseMappedConstraint => "reverseMappedConstraint",
                EdgeKind::Alias => "alias",
                EdgeKind::AliasTypeArgument => "aliasTypeArgument",
                EdgeKind::Intersection => "intersection",
            };

            kind_maps
                .entry(kind_str.to_string())
                .or_insert_with(HashMap::new)
                .entry(link.target)
                .or_insert_with(Vec::new)
                .push(link.source);
        }

        // Build a map from type id -> optional path
        let path_map = TypeGraph::build_path_map(types);

        // Convert to EdgeStats (sorted by source count)
        for (kind, target_map) in kind_maps {
            let mut links: Vec<(TypeId, Vec<TypeId>, Option<String>)> = target_map
                .into_iter()
                .map(|(tid, srcs)| {
                    let p = path_map.get(&tid).cloned().unwrap_or(None);
                    (tid, srcs, p)
                })
                .collect();
            // Sort by number of sources, descending
            links.sort_by(|a, b| b.1.len().cmp(&a.1.len()));

            let max = links.first().map(|e| e.1.len()).unwrap_or(0);
            self.edge_stats.insert(kind, EdgeStats { links, max });
        }

        let limit = 20;
        for (_kind, stats) in self.edge_stats.iter_mut() {
            if stats.links.len() > limit {
                stats.links.truncate(limit);
            }
            // Ensure max remains accurate after truncation
            stats.max = stats.links.first().map(|e| e.1.len()).unwrap_or(0);
        }

        // Ensure every known edge kind is present in `edge_stats` so serialization
        // always emits the key (empty array when no entries).
        let all_kinds = [
            "union",
            "typeArgument",
            "instantiated",
            "substitutionBase",
            "constraint",
            "indexedAccessObject",
            "indexedAccessIndex",
            "conditionalCheck",
            "conditionalExtends",
            "conditionalTrue",
            "conditionalFalse",
            "keyof",
            "evolvingArrayElement",
            "evolvingArrayFinal",
            "reverseMappedSource",
            "reverseMappedMapped",
            "reverseMappedConstraint",
            "alias",
            "aliasTypeArgument",
            "intersection",
        ];

        for &k in all_kinds.iter() {
            self.edge_stats.entry(k.to_string()).or_insert(EdgeStats {
                links: Vec::new(),
                max: 0,
            });
        }
    }

    fn calculate_node_stats(&mut self, types: &TypesJsonSchema) {
        // Helper to compute counts per node for a given accessor
        fn collect_counts<F>(types: &TypesJsonSchema, accessor: F) -> Vec<(TypeId, String, usize)>
        where
            F: Fn(&crate::validate::types_json::ResolvedType) -> Option<&Vec<TypeId>>,
        {
            let mut entries: Vec<(TypeId, String, usize)> = Vec::new();
            for t in types.iter() {
                let count = accessor(t).map(|v| v.len()).unwrap_or(0);
                if count > 0 {
                    let name = TypeGraph::human_readable_name(t);
                    entries.push((t.id, name, count));
                }
            }
            // Sort descending by count
            entries.sort_by(|a, b| b.2.cmp(&a.2));
            entries
        }

        // Build path map to include in node entries
        let path_map = TypeGraph::build_path_map(types);

        let type_arguments = collect_counts(types, |t| t.type_arguments.as_ref());
        let union_types = collect_counts(types, |t| t.union_types.as_ref());
        let intersection_types = collect_counts(types, |t| t.intersection_types.as_ref());
        let alias_type_arguments = collect_counts(types, |t| t.alias_type_arguments.as_ref());

        let limit = 100;
        let build_category = |mut v: Vec<(TypeId, String, usize)>| -> NodeStatCategory {
            let max = v.first().map(|e| e.2).unwrap_or(0);
            if v.len() > limit {
                v.truncate(limit);
            }
            // Attach path info from path_map
            let nodes_with_path: Vec<(TypeId, String, usize, Option<String>)> = v
                .into_iter()
                .map(|(id, name, val)| {
                    let p = path_map.get(&id).cloned().unwrap_or(None);
                    (id, name, val, p)
                })
                .collect();
            NodeStatCategory {
                max,
                nodes: nodes_with_path,
            }
        };

        self.node_stats = NodeStats {
            type_arguments: build_category(type_arguments),
            union_types: build_category(union_types),
            intersection_types: build_category(intersection_types),
            alias_type_arguments: build_category(alias_type_arguments),
        };
    }

    pub fn to_force_graph(&self) -> ForceGraphData {
        let nodes: Vec<ForceGraphNode> = self
            .nodes
            .values()
            .map(|n| ForceGraphNode {
                id: n.id,
                name: n.name.clone(),
            })
            .collect();

        let links: Vec<ForceGraphLink> = self
            .links
            .iter()
            .map(|l| ForceGraphLink {
                source: l.source,
                target: l.target,
                kind: l.kind.clone(),
            })
            .collect();

        // Count edge kinds
        let mut count: HashMap<String, usize> = HashMap::new();
        for link in &self.links {
            let kind_str = match link.kind {
                EdgeKind::Union => "union",
                EdgeKind::TypeArgument => "typeArgument",
                EdgeKind::Instantiated => "instantiated",
                EdgeKind::SubstitutionBase => "substitutionBase",
                EdgeKind::Constraint => "constraint",
                EdgeKind::IndexedAccessObject => "indexedAccessObject",
                EdgeKind::IndexedAccessIndex => "indexedAccessIndex",
                EdgeKind::ConditionalCheck => "conditionalCheck",
                EdgeKind::ConditionalExtends => "conditionalExtends",
                EdgeKind::ConditionalTrue => "conditionalTrue",
                EdgeKind::ConditionalFalse => "conditionalFalse",
                EdgeKind::Keyof => "keyof",
                EdgeKind::EvolvingArrayElement => "evolvingArrayElement",
                EdgeKind::EvolvingArrayFinal => "evolvingArrayFinal",
                EdgeKind::ReverseMappedSource => "reverseMappedSource",
                EdgeKind::ReverseMappedMapped => "reverseMappedMapped",
                EdgeKind::ReverseMappedConstraint => "reverseMappedConstraint",
                EdgeKind::Alias => "alias",
                EdgeKind::AliasTypeArgument => "aliasTypeArgument",
                EdgeKind::Intersection => "intersection",
            };
            *count.entry(kind_str.to_string()).or_insert(0) += 1;
        }

        ForceGraphData {
            nodes,
            links,
            stats: GraphStats { count },
            edge_stats: self.edge_stats.clone(),
            node_stats: self.node_stats.clone(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeStatCategory {
    pub max: usize,
    /// Array of [typeId, name, value]
    pub nodes: Vec<(TypeId, String, usize, Option<String>)>,
}

impl Default for NodeStatCategory {
    fn default() -> Self {
        Self {
            max: 0,
            nodes: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NodeStats {
    pub type_arguments: NodeStatCategory,
    pub union_types: NodeStatCategory,
    pub intersection_types: NodeStatCategory,
    pub alias_type_arguments: NodeStatCategory,
}

// react-force-graph expected shape
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ForceGraphNode {
    pub id: TypeId,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ForceGraphLink {
    pub source: TypeId,
    pub target: TypeId,
    pub kind: EdgeKind,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ForceGraphData {
    pub nodes: Vec<ForceGraphNode>,
    pub links: Vec<ForceGraphLink>,
    pub stats: GraphStats,
    pub edge_stats: HashMap<String, EdgeStats>,
    pub node_stats: NodeStats,
}

/// Build the in-memory graph from the loaded `types_json` and store in AppData via `State`.
#[tauri::command]
pub fn build_type_graph(
    _app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<AppData>>>,
) -> Result<(), String> {
    let types: TypesJsonSchema = {
        let app_data = state
            .lock()
            .map_err(|_| "AppData mutex poisoned".to_string())?;

        // Check if both types.json and trace.json exist
        if app_data.types_json.is_empty() {
            return Err("Cannot build type graph: types.json is required".to_string());
        }

        if app_data.trace_json.is_empty() {
            return Err("Cannot build type graph: trace.json is required".to_string());
        }

        app_data.types_json.clone()
    };

    // Build the graph
    let graph = TypeGraph::from_types(&types);

    // Attach to LayerCake or settings? Keep simple: stash in `cake` extras via BTreeMap
    // For now, we add it to an ad-hoc static holder in AppData via lazy BTreeMap-like cache.
    // Since AppData does not yet include a graph field, we use a simple file cache as fallback.
    // To keep everything in-memory, we store it on the `auth_code` field comment-free by extending AppData later if needed.
    // Minimal approach: serialize into a ForceGraphData and keep as text output for retrieval.

    // Store in AppData for quick in-memory access
    {
        let mut app_data = state
            .lock()
            .map_err(|_| "AppData mutex poisoned".to_string())?;
        app_data.type_graph = Some(graph);

        // Persist to outputs/type-graph.json for refresh-on-boot
        let outputs_dir = app_data.outputs_dir();
        let path = outputs_dir.join(TYPE_GRAPH_FILENAME);
        let json = serde_json::to_string_pretty(&app_data.type_graph)
            .map_err(|e| format!("Failed to serialize type_graph: {e}"))?;
        std::fs::create_dir_all(&outputs_dir)
            .map_err(|e| format!("Failed to create outputs dir: {e}"))?;
        std::fs::write(&path, json)
            .map_err(|e| format!("Failed to write {}: {e}", path.display()))?;
    }

    Ok(())
}

/// Return the graph data formatted for react-force-graph. Builds if missing.
#[tauri::command]
pub fn get_type_graph(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<AppData>>>,
) -> Result<ForceGraphData, String> {
    // If not yet built, build once
    let needs_build = {
        let app_data = state
            .lock()
            .map_err(|_| "AppData mutex poisoned".to_string())?;
        app_data.type_graph.is_none()
    };
    if needs_build {
        build_type_graph(app.clone(), state.clone())?;
    }

    let app_data = state
        .lock()
        .map_err(|_| "AppData mutex poisoned".to_string())?;
    let fg = app_data
        .type_graph
        .as_ref()
        .map(|g| g.to_force_graph())
        .ok_or_else(|| "type graph unavailable".to_string())?;
    Ok(fg)
}

#[tauri::command]
pub fn get_type_graph_text(
    state: State<'_, std::sync::Arc<std::sync::Mutex<AppData>>>,
) -> Result<String, String> {
    let app_data = state
        .lock()
        .map_err(|_| "AppData mutex poisoned".to_string())?;
    let fg = app_data
        .type_graph
        .as_ref()
        .ok_or_else(|| "type graph unavailable".to_string())?;
    let json = serde_json::to_string_pretty(fg)
        .map_err(|e| format!("Failed to serialize type_graph: {e}"))?;
    Ok(json)
}
