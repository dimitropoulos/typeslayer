use crate::{
    app_data::AppData,
    type_graph::LinkKind,
    validate::{trace_json::TraceEvent, types_json::ResolvedType, utils::TypeId},
};
use std::collections::HashMap;
use tauri::State;
use tokio::sync::Mutex;

type Links = Vec<(LinkKind, Vec<(TypeId, String)>)>;

#[tauri::command]
pub async fn get_links_to_type_id(
    state: State<'_, &Mutex<AppData>>,
    type_id: usize,
) -> Result<Links, String> {
    let data = state.lock().await;

    if let Some(graph) = &data.type_graph {
        let mut results: Links = graph
            .link_kind_data_by_kind
            .iter()
            .map(|(kind, link_kind_data)| {
                let mut entries = Vec::new();
                let sources = link_kind_data.by_target.target_to_sources.get(&type_id);
                if let Some(sources) = sources {
                    for source_id in sources {
                        let name = data
                            .types_json
                            .get(*source_id)
                            .map(|t| t.human_readable_name())
                            .unwrap_or_else(|| "Unknown".to_string());
                        entries.push((*source_id, name));
                    }
                }
                (kind.clone(), entries)
            })
            .filter(|(_, entries)| !entries.is_empty())
            .collect();
        results.sort_by_key(|(_, entries)| std::cmp::Reverse(entries.len()));
        Ok(results)
    } else {
        Err("No type graph available".to_string())
    }
}

#[tauri::command]
pub async fn get_resolved_type_by_id(
    state: State<'_, &Mutex<AppData>>,
    type_id: Option<usize>,
) -> Result<Option<ResolvedType>, String> {
    if let Some(id) = type_id {
        let data = state.lock().await;
        if let Some(t) = data.types_json.get(id) {
            Ok(Some(t.clone()))
        } else {
            Err(format!("Type with id {id} not found"))
        }
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn get_resolved_types_by_ids(
    state: State<'_, &Mutex<AppData>>,
    type_ids: Option<Vec<usize>>,
) -> Result<HashMap<usize, Option<ResolvedType>>, String> {
    let mut result = HashMap::new();
    let data = state.lock().await;
    if let Some(ids) = type_ids {
        for id in ids {
            let entry = data.types_json.get(id).cloned();
            result.insert(id, entry);
        }
    }
    Ok(result)
}

#[tauri::command]
pub async fn get_recursive_resolved_types(
    state: State<'_, &Mutex<AppData>>,
    type_id: Option<usize>,
) -> Result<HashMap<TypeId, ResolvedType>, String> {
    if type_id.is_none() {
        return Ok(HashMap::new());
    }

    let data = state.lock().await;

    let mut result = HashMap::new();

    fn collect_types(
        current_id: TypeId,
        accumulator: &mut HashMap<TypeId, ResolvedType>,
        types: &[ResolvedType],
    ) {
        if accumulator.contains_key(&current_id) {
            return;
        }
        if let Some(resolved_type) = types.get(current_id) {
            accumulator.insert(current_id, resolved_type.clone());
            for link in resolved_type.get_relationships() {
                collect_types(link.target, accumulator, types);
            }
        }
    }

    let types: &[ResolvedType] = &data.types_json;
    collect_types(type_id.unwrap(), &mut result, types);
    Ok(result)
}

#[tauri::command]
pub async fn get_traces_related_to_typeid(
    state: State<'_, &Mutex<AppData>>,
    type_id: usize,
) -> Result<Vec<TraceEvent>, String> {
    let typeid = type_id as i64;
    let data = state.lock().await;
    let events = data
        .trace_json
        .iter()
        .filter(|event| match event {
            TraceEvent::CheckTypeParameterDeferred { args, .. } => {
                args.parent == typeid || args.id == typeid
            }
            TraceEvent::CheckTypeRelatedToDepthLimit { args, .. } => {
                args.source_id == typeid || args.target_id == typeid
            }
            TraceEvent::StructuredTypeRelatedTo { args, .. } => {
                args.source_id == typeid || args.target_id == typeid
            }
            TraceEvent::TypeRelatedToDiscriminatedTypeDepthLimit { args, .. } => {
                args.source_id == typeid || args.target_id == typeid
            }
            TraceEvent::TraceUnionsOrIntersectionsTooLargeDepthLimit { args, .. } => {
                args.source_id == typeid || args.target_id == typeid
            }
            TraceEvent::CheckCrossProductUnionDepthLimit { args, .. } => {
                args.type_ids.contains(&typeid)
            }
            TraceEvent::RemoveSubtypesDepthLimit { args, .. } => args.type_ids.contains(&typeid),
            TraceEvent::InstantiateTypeDepthLimit { args, .. } => args.type_id == typeid,
            TraceEvent::RecursiveTypeRelatedToDepthLimit { args, .. } => {
                args.source_id == typeid
                    || args.target_id == typeid
                    || args.source_id_stack.contains(&typeid)
                    || args.target_id_stack.contains(&typeid)
            }
            _ => false,
        })
        .cloned()
        .collect();
    Ok(events)
}
