use serde::ser::Error as _;
use serde::{Deserialize, Serialize, Serializer};
use serde_json::value::RawValue;
use std::collections::HashMap;

use crate::validate::types_json::{Flag, ResolvedType, TypesJsonSchema};
use crate::validate::utils::TypeId;

pub const TYPE_GRAPH_FILENAME: &str = "type-graph.json";

#[derive(Eq, PartialEq, Hash, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum LinkKind {
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

impl LinkKind {
    pub fn values() -> &'static [LinkKind] {
        use LinkKind::*;
        &[
            AliasTypeArgument,
            Intersection,
            TypeArgument,
            Union,
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
        ]
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphLink {
    pub source: TypeId,
    pub target: TypeId,
    pub kind: LinkKind,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GraphStats {
    pub count: HashMap<LinkKind, usize>,
}

fn serialize_compact_typeids<S>(vec: &Vec<usize>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    // Make a compact JSON array like "[1,2,3]"
    let s = serde_json::to_string(vec).map_err(S::Error::custom)?;
    // Wrap it as raw JSON so pretty-printing won't reformat it
    let raw = RawValue::from_string(s).map_err(S::Error::custom)?;
    raw.serialize(serializer)
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LinkStatLink {
    pub target_id: TypeId,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(serialize_with = "serialize_compact_typeids")]
    pub source_ids: Vec<TypeId>,
}

/// Stats for a specific link kind: ordered list of (target_id, [source_ids])
/// Ordered by number of sources (most connected first)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LinkStats {
    /// Largest source count across entries
    pub max: usize,
    /// sorted by source_ids count descending
    pub links: Vec<LinkStatLink>,
}

pub type GraphLinkStats = HashMap<LinkKind, LinkStats>;

#[derive(Eq, PartialEq, Hash, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum NodeStatKind {
    TypeArguments,
    UnionTypes,
    IntersectionTypes,
    AliasTypeArguments,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeStatNode {
    pub id: TypeId,
    pub name: String,
    pub value: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NodeStatCategory {
    pub max: usize,
    pub nodes: Vec<NodeStatNode>,
}

pub type GraphNodeStats = HashMap<NodeStatKind, NodeStatCategory>;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TypeGraph {
    pub nodes: usize,
    pub stats: GraphStats,
    pub link_stats: GraphLinkStats,
    pub node_stats: GraphNodeStats,
    pub links: Vec<GraphLink>,
}

/// Return a human-readable type name similar to frontend's getHumanReadableName
pub fn human_readable_name(t: &ResolvedType) -> String {
    let is_literal = t.flags.iter().any(|f| {
        matches!(
            f,
            Flag::StringLiteral | Flag::NumberLiteral | Flag::BooleanLiteral | Flag::BigIntLiteral
        )
    });
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

impl TypeGraph {
    pub fn from_types(types: &TypesJsonSchema) -> Self {
        let mut graph = TypeGraph::default();
        graph.calculate_nodes(types);
        graph.calculate_links(types);
        graph.calculate_link_stats(types);
        graph.calculate_node_stats(types);
        graph.calculate_counts();
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

    fn calculate_nodes(&mut self, types: &TypesJsonSchema) {
        // TypeIds start at 1, but we add an index at 0 so it always lines up
        if types.is_empty() {
            self.nodes = 0;
            return;
        }
        self.nodes = types.len() - 1;
    }

    fn calculate_links(&mut self, types: &TypesJsonSchema) {
        // TypeIds start at 1
        let last_type_id = self.nodes;
        // Collect links to add in a temporary vector to avoid double borrowing self
        let mut new_links = Vec::new();

        // Second pass: add links for supported relations
        for t in types.iter() {
            for link in get_relationships_for_type(t) {
                let source_exists = link.source <= last_type_id;
                let target_exists = link.target <= last_type_id;
                if source_exists && target_exists {
                    new_links.push(link);
                }
            }
        }

        self.links.extend(new_links);
    }

    fn calculate_link_stats(&mut self, types: &TypesJsonSchema) {
        let mut link_stats_by_type_id: HashMap<LinkKind, HashMap<TypeId, Vec<TypeId>>> =
            HashMap::new();
        let path_map = TypeGraph::build_path_map(types);

        // 1. loop through all the links and for each LinkKind and append to an internal hashmap by TypeId (target) -> Vec<TypeId> (sources)
        // 2. transform the HashMap<TypeId, Vec<TypeId>> to a Vec<LinkStatLink>
        // 3. sort the Vec<LinkStatLink> by the length of the sources vector descending
        // 4. limit the Vec<LinkStatLink> to the top 100 entries
        // 5. record the maximum length of the sources (the first entry's source_ids length)

        // 1.
        for link in &self.links {
            let kind = &link.kind;
            let target_id = link.target;
            let source_id = link.source;
            let sources = link_stats_by_type_id
                .entry(kind.clone())
                .or_insert_with(HashMap::new)
                .entry(target_id)
                .or_insert_with(Vec::new);
            sources.push(source_id);
        }

        // 2.
        let mut link_stats: HashMap<LinkKind, LinkStats> = HashMap::new();
        for (kind, by_type_id) in link_stats_by_type_id {
            let mut links: Vec<LinkStatLink> = by_type_id
                .into_iter()
                .map(|(target_id, source_ids)| LinkStatLink {
                    target_id,
                    source_ids,
                    path: None,
                })
                .collect();
            // 3.
            links.sort_by(|a, b| b.source_ids.len().cmp(&a.source_ids.len()));
            // 4.
            links.truncate(100);
            // 5.
            let max = links.first().map(|e| e.source_ids.len()).unwrap_or(0);
            let mut stat = LinkStats { max, links };
            // Add path info from path_map
            for link in &mut stat.links {
                if let Some(p) = path_map.get(&link.target_id) {
                    link.path = p.clone();
                }
            }
            link_stats.insert(kind, stat);
        }

        self.link_stats = link_stats;
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
                    let name = human_readable_name(t);
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
            let nodes_with_path = v
                .into_iter()
                .map(|(id, name, value)| NodeStatNode {
                    id,
                    name,
                    value,
                    path: path_map.get(&id).cloned().unwrap_or(None),
                })
                .collect();

            NodeStatCategory {
                max,
                nodes: nodes_with_path,
            }
        };

        self.node_stats = HashMap::from([
            (NodeStatKind::TypeArguments, build_category(type_arguments)),
            (NodeStatKind::UnionTypes, build_category(union_types)),
            (
                NodeStatKind::IntersectionTypes,
                build_category(intersection_types),
            ),
            (
                NodeStatKind::AliasTypeArguments,
                build_category(alias_type_arguments),
            ),
        ]);
    }

    pub fn calculate_counts(&mut self) {
        let mut count: HashMap<LinkKind, usize> = HashMap::new();
        for link in &self.links {
            let entry = count.entry(link.kind.clone()).or_insert(0);
            *entry += 1;
        }
        self.stats = GraphStats { count };
    }
}

pub fn get_relationships_for_type(t: &ResolvedType) -> Vec<GraphLink> {
    let mut relations = Vec::new();

    // Single relationships
    for (opt_target, kind) in [
        (t.instantiated_type, LinkKind::Instantiated),
        (t.substitution_base_type, LinkKind::SubstitutionBase),
        (t.constraint_type, LinkKind::Constraint),
        (t.indexed_access_object_type, LinkKind::IndexedAccessObject),
        (t.indexed_access_index_type, LinkKind::IndexedAccessIndex),
        (t.conditional_check_type, LinkKind::ConditionalCheck),
        (t.conditional_extends_type, LinkKind::ConditionalExtends),
        (t.conditional_true_type, LinkKind::ConditionalTrue),
        (t.conditional_false_type, LinkKind::ConditionalFalse),
        (t.keyof_type, LinkKind::Keyof),
        (
            t.evolving_array_element_type,
            LinkKind::EvolvingArrayElement,
        ),
        (t.evolving_array_final_type, LinkKind::EvolvingArrayFinal),
        (t.reverse_mapped_source_type, LinkKind::ReverseMappedSource),
        (t.reverse_mapped_mapped_type, LinkKind::ReverseMappedMapped),
        (
            t.reverse_mapped_constraint_type,
            LinkKind::ReverseMappedConstraint,
        ),
        (t.alias_type, LinkKind::Alias),
    ] {
        if let Some(target) = opt_target {
            relations.push(GraphLink {
                source: t.id,
                target,
                kind: kind.clone(),
            });
        }
    }

    for (opt_targets, kind) in [
        (t.alias_type_arguments.as_ref(), LinkKind::AliasTypeArgument),
        (t.intersection_types.as_ref(), LinkKind::Intersection),
        (t.union_types.as_ref(), LinkKind::Union),
        (t.type_arguments.as_ref(), LinkKind::TypeArgument),
    ] {
        if let Some(targets) = opt_targets {
            for &target in targets {
                relations.push(GraphLink {
                    source: t.id,
                    target,
                    kind: kind.clone(),
                });
            }
        }
    }

    return relations;
}
