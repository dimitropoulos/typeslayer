use indexmap::IndexMap;
use serde::ser::Error as _;
use serde::{Deserialize, Serialize, Serializer};
use serde_json::value::RawValue;
use std::collections::HashMap;
use std::hash::Hash;
use strum::VariantArray;
use strum_macros::VariantArray;

use crate::validate::types_json::TypesJsonSchema;
use crate::validate::utils::TypeId;

pub const TYPE_GRAPH_FILENAME: &str = "type-graph.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CountAndMax {
    pub count: usize,
    pub max: usize,
}

#[derive(Eq, PartialEq, Hash, Debug, Clone, Serialize, Deserialize, VariantArray)]
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
    pub fn new_link_kind_data_by_kind() -> HashMap<LinkKind, LinkKindData> {
        LinkKind::VARIANTS
            .iter()
            .map(|kind| (kind.clone(), LinkKindData::default()))
            .collect()
    }
    pub fn new_count_and_max_map() -> HashMap<LinkKind, CountAndMax> {
        LinkKind::VARIANTS
            .iter()
            .map(|kind| (kind.clone(), CountAndMax { count: 0, max: 0 }))
            .collect()
    }
}

/// source is the type that contains the data for the link (originally, in the ResolvedType)
/// so for example, if you have a union type:
/// - the source is the id of the union type itself
/// - each target id is one of the types that are members of the union
/// - kind is LinkKind::Union
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphLinkWithKind {
    pub source: TypeId,
    pub target: TypeId,
    pub kind: LinkKind,
}

// fn serialize_compact_typeids<S>(vec: &Vec<usize>, serializer: S) -> Result<S::Ok, S::Error>
// where
//     S: Serializer,
// {
//     // Make a compact JSON array like "[1,2,3]"
//     let s = serde_json::to_string(vec).map_err(S::Error::custom)?;
//     // Wrap it as raw JSON so pretty-printing won't reformat it
//     let raw = RawValue::from_string(s).map_err(S::Error::custom)?;
//     raw.serialize(serializer)
// }

/// takes an IndexMap<TypeId, Vec<TypeId>>
/// returns [(TypeId, Vec<TypeId>)] but with no spaces, and only newlines for each entry
fn serialize_compact_typeid_to_typeids<S>(
    map: &IndexMap<TypeId, Vec<TypeId>>,
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    // Convert to a vector of tuples for serialization
    let vec: Vec<(TypeId, &Vec<TypeId>)> = map.iter().map(|(k, v)| (*k, v)).collect();
    // Serialize the vector using the compact serializer for Vec<TypeId>
    let s = serde_json::to_string(&vec)
        .map_err(S::Error::custom)?
        .replace("[[", "[\n[") // and newline for first entry
        .replace("],", "],\n"); // Add newlines between entries
    let raw = RawValue::from_string(s).map_err(S::Error::custom)?;
    raw.serialize(serializer)
}

fn deserialize_indexmap_typeid_to_typeids<'de, D>(
    deserializer: D,
) -> Result<IndexMap<TypeId, Vec<TypeId>>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    // Deserialize into a vector of tuples first
    let vec: Vec<(TypeId, Vec<TypeId>)> = serde::Deserialize::deserialize(deserializer)?;
    // Convert the vector into an IndexMap
    let map: IndexMap<TypeId, Vec<TypeId>> = IndexMap::from_iter(vec);
    Ok(map)
}

/// this is sortof a reverse link representation because it's organized by the target
/// consider that for a resolved type, you easily have access to what it's children relationships are via resolved_type.get_relationships()
/// but if you want to go the other direction, that's what this is for
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ByTarget {
    /// Largest source count across entries
    pub max: usize,
    /// number of total types are related to by any other type in this way
    pub count: usize,
    /// Record<TargetId, SourceId[]>
    /// sorted by source_ids count descending
    #[serde(
        serialize_with = "serialize_compact_typeid_to_typeids",
        deserialize_with = "deserialize_indexmap_typeid_to_typeids"
    )]
    pub target_to_sources: IndexMap<TypeId, Vec<TypeId>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct BySource {
    /// Largest target count across entries
    pub max: usize,
    /// number of total types that are targeted by links of this kind
    pub count: usize,
    /// Record<SourceId, TargetId[]>
    /// sorted by target_ids count descending
    #[serde(
        serialize_with = "serialize_compact_typeid_to_typeids",
        deserialize_with = "deserialize_indexmap_typeid_to_typeids"
    )]
    pub source_to_targets: IndexMap<TypeId, Vec<TypeId>>,
}

/// Stats for a specific link kind: ordered list of (target_id, [source_ids])
/// Ordered by number of sources (most connected first)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LinkKindData {
    /// sorted by source_ids count descending
    pub by_target: ByTarget,

    /// sorted by target_ids count descending
    pub by_source: BySource,

    // the total number of links of this kind in the graph
    pub link_count: usize,
}

#[derive(Eq, PartialEq, Hash, Debug, Clone, Serialize, Deserialize, VariantArray)]
#[serde(rename_all = "camelCase")]
pub enum NodeStatKind {
    TypeArguments,
    UnionTypes,
    IntersectionTypes,
    AliasTypeArguments,
}

impl NodeStatKind {
    pub fn new_count_and_max_map() -> HashMap<NodeStatKind, CountAndMax> {
        NodeStatKind::VARIANTS
            .iter()
            .map(|kind| (kind.clone(), CountAndMax { count: 0, max: 0 }))
            .collect()
    }
}

/// this exists to summarize the info so we can use it in awards
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphStatNode {
    pub id: TypeId,
    pub name: String,
    pub value: usize, // how much of this stat this node has.  so for example if the stat is union, this value shows how many unions this type contains under it
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>, // necessary for showing in the UI before clicking
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NodeStatKindData {
    pub count: usize,
    pub max: usize,
    pub nodes: Vec<GraphStatNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TypeGraph {
    pub node_count: usize,
    pub node_data_by_kind: HashMap<NodeStatKind, NodeStatKindData>,
    pub link_count: usize,
    pub link_kind_data_by_kind: HashMap<LinkKind, LinkKindData>,
    pub path_map: HashMap<TypeId, String>,
}

impl TypeGraph {
    pub fn from_types(types: &TypesJsonSchema) -> Self {
        let mut graph = TypeGraph::default();
        graph.path_map = TypeGraph::build_path_map(types);
        graph.node_count = graph.calculate_node_count(types);
        graph.link_kind_data_by_kind = graph.calculate_link_kind_data_by_kind(types);
        graph.link_count = graph.calculate_link_count();
        graph.node_data_by_kind = graph.calculate_node_data_by_kind(types);
        graph
    }

    /// Build a map from type id -> optional path (mimics extractPath)
    fn build_path_map(types: &TypesJsonSchema) -> HashMap<TypeId, String> {
        let mut path_map = HashMap::new();
        for resolved_type in types.iter() {
            let path = resolved_type.get_path();
            if let Some(path) = path {
                // only store if there's a path
                path_map.insert(resolved_type.id, path);
            }
        }
        path_map
    }

    fn calculate_node_count(&mut self, types: &TypesJsonSchema) -> usize {
        // TypeIds start at 1, but we add an index at 0 so it always lines up
        if types.is_empty() { 0 } else { types.len() - 1 }
    }

    fn calculate_link_count(&self) -> usize {
        self.link_kind_data_by_kind
            .values()
            .map(|link_stat| link_stat.link_count)
            .sum()
    }

    /// total number of links in the graph
    pub fn calculate_links_total(&self) -> usize {
        self.link_kind_data_by_kind
            .values()
            .map(|link_stat| link_stat.link_count)
            .sum()
    }

    fn calculate_link_kind_data_by_kind(
        &mut self,
        types: &TypesJsonSchema,
    ) -> HashMap<LinkKind, LinkKindData> {
        let mut link_kind_data_by_kind = LinkKind::new_link_kind_data_by_kind();

        for resolved_type in types {
            let relationships = resolved_type.get_relationships();
            for relation in relationships {
                let link_kind_data = link_kind_data_by_kind
                    .get_mut(&relation.kind)
                    .expect("LinkKind should exist in map");

                // Update ParentLinkData (target -> sources)
                let parent_data = &mut link_kind_data.by_target;
                let sources = parent_data
                    .target_to_sources
                    .entry(relation.target)
                    .or_default();
                sources.push(relation.source);

                // Update ChildLinkData (source -> targets)
                let child_data = &mut link_kind_data.by_source;
                let targets = child_data
                    .source_to_targets
                    .entry(relation.source)
                    .or_default();
                targets.push(relation.target);
            }
        }

        // sort each LinkKindData's links by number of sources descending and set max/count
        for link_kind_data in link_kind_data_by_kind.values_mut() {
            // ParentLinkData
            let parent_data = &mut link_kind_data.by_target;
            let mut parent_entries: Vec<(TypeId, Vec<TypeId>)> = parent_data
                .target_to_sources
                .iter()
                .map(|(k, v)| (*k, v.clone()))
                .collect();
            parent_entries.sort_by(|a, b| b.1.len().cmp(&a.1.len()));
            parent_data.target_to_sources = IndexMap::from_iter(parent_entries.into_iter());
            parent_data.count = parent_data.target_to_sources.len();
            parent_data.max = parent_data
                .target_to_sources
                .values()
                .map(|v| v.len())
                .max()
                .unwrap_or(0);

            // ChildLinkData
            let child_data = &mut link_kind_data.by_source;
            let mut child_entries: Vec<(TypeId, Vec<TypeId>)> = child_data
                .source_to_targets
                .iter()
                .map(|(k, v)| (*k, v.clone()))
                .collect();
            child_entries.sort_by(|a, b| b.1.len().cmp(&a.1.len()));
            child_data.source_to_targets = IndexMap::from_iter(child_entries.into_iter());
            child_data.count = child_data.source_to_targets.len();
            child_data.max = child_data
                .source_to_targets
                .values()
                .map(|v| v.len())
                .max()
                .unwrap_or(0);

            let total_according_to_parents: usize = link_kind_data
                .by_target
                .target_to_sources
                .values()
                .map(|v| v.len())
                .sum();

            let total_according_to_children: usize = link_kind_data
                .by_source
                .source_to_targets
                .values()
                .map(|v| v.len())
                .sum();

            assert_eq!(
                total_according_to_parents, total_according_to_children,
                "Link counts from parents and children do not match, but they totally should",
            );

            link_kind_data.link_count = total_according_to_children
        }

        link_kind_data_by_kind
    }

    fn calculate_node_data_by_kind(
        &mut self,
        types: &TypesJsonSchema,
    ) -> HashMap<NodeStatKind, NodeStatKindData> {
        // Helper to compute counts per node for a given accessor
        fn collect_counts<F>(types: &TypesJsonSchema, accessor: F) -> Vec<(TypeId, String, usize)>
        where
            F: Fn(&crate::validate::types_json::ResolvedType) -> Option<&Vec<TypeId>>,
        {
            let mut entries: Vec<(TypeId, String, usize)> = Vec::new();
            for t in types.iter() {
                let count = accessor(t).map(|v| v.len()).unwrap_or(0);
                if count > 0 {
                    entries.push((t.id, t.human_readable_name(), count));
                }
            }
            // Sort descending by count
            entries.sort_by(|a, b| b.2.cmp(&a.2));
            entries
        }

        let type_arguments = collect_counts(types, |t| t.type_arguments.as_ref());
        let union_types = collect_counts(types, |t| t.union_types.as_ref());
        let intersection_types = collect_counts(types, |t| t.intersection_types.as_ref());
        let alias_type_arguments = collect_counts(types, |t| t.alias_type_arguments.as_ref());

        let limit = 100;
        let build_category = |mut v: Vec<(TypeId, String, usize)>| -> NodeStatKindData {
            let max = v.first().map(|e| e.2).unwrap_or(0);
            let count = v.len();
            if count > limit {
                v.truncate(limit);
            }
            // Attach path info from path_map
            let nodes_with_path = v
                .into_iter()
                .map(|(id, name, value)| GraphStatNode {
                    id,
                    name,
                    value,
                    path: self.path_map.get(&id).cloned(),
                })
                .collect();

            NodeStatKindData {
                count,
                max,
                nodes: nodes_with_path,
            }
        };

        HashMap::from([
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
        ])
    }

    pub fn calculate_node_stat_count_and_max(&self) -> HashMap<NodeStatKind, CountAndMax> {
        self.node_data_by_kind
            .iter()
            .map(|(kind, node_stat_category)| {
                (
                    kind.clone(),
                    CountAndMax {
                        count: node_stat_category.count,
                        max: node_stat_category.max,
                    },
                )
            })
            .collect()
    }

    pub fn calculate_link_count_and_max(&self) -> HashMap<LinkKind, CountAndMax> {
        self.link_kind_data_by_kind
            .iter()
            .map(|(kind, link_kind_data)| {
                (
                    kind.clone(),
                    CountAndMax {
                        count: link_kind_data.link_count,
                        max: link_kind_data.by_source.max,
                    },
                )
            })
            .collect()
    }
}
