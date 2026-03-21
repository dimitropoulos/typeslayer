use crate::{
    app_data::AppData,
    type_graph::LinkKind,
    validate::{trace_json::TraceEvent, types_json::ResolvedType, utils::TypeId},
};
use biome_formatter::{IndentStyle, IndentWidth, LineWidth};
use biome_js_formatter::{context::JsFormatOptions, format_node};
use biome_js_parser::parse;
use biome_js_syntax::JsFileSource;
use std::collections::HashMap;
use tauri::State;
use tokio::sync::Mutex;

type Links = Vec<(LinkKind, Vec<(TypeId, String)>)>;

#[tauri::command]
pub async fn get_links_to_type_id(
    state: State<'_, &Mutex<AppData>>,
    type_id: usize,
) -> Result<Links, String> {
    let app_data = state.lock().await;

    if let Some(graph) = &app_data.type_graph {
        let mut results: Links = graph
            .link_kind_data_by_kind
            .iter()
            .map(|(kind, link_kind_data)| {
                let mut entries = Vec::new();
                let sources = link_kind_data.by_target.target_to_sources.get(&type_id);
                if let Some(sources) = sources {
                    for source_id in sources {
                        let name = app_data
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
        let app_data = state.lock().await;
        if let Some(t) = app_data.types_json.get(id) {
            let mut resolved = t.clone();
            if let Some(display) = &resolved.display {
                resolved.display = Some(format_type_display(display));
            }
            Ok(Some(resolved))
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
    let app_data = state.lock().await;
    if let Some(ids) = type_ids {
        for id in ids {
            let entry = app_data.types_json.get(id).cloned().map(|mut resolved| {
                if let Some(display) = &resolved.display {
                    resolved.display = Some(format_type_display(display));
                }
                resolved
            });
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

    let app_data = state.lock().await;

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

    let types: &[ResolvedType] = &app_data.types_json;
    collect_types(type_id.unwrap(), &mut result, types);

    for resolved in result.values_mut() {
        if let Some(display) = &resolved.display {
            resolved.display = Some(format_type_display(display));
        }
    }

    Ok(result)
}

#[tauri::command]
pub async fn get_traces_related_to_typeid(
    state: State<'_, &Mutex<AppData>>,
    type_id: usize,
) -> Result<Vec<TraceEvent>, String> {
    let typeid = type_id as i64;
    let app_data = state.lock().await;
    let events = app_data
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

fn format_type_display(display: &str) -> String {
    let wrapped = format!("type t = {display}");
    let source = JsFileSource::ts();
    let parsed = parse(&wrapped, source, Default::default());

    if parsed.has_errors() {
        return display.to_string();
    }

    let options = JsFormatOptions::new(source)
        .with_indent_style(IndentStyle::Tab)
        .with_indent_width(IndentWidth::default())
        .with_line_width(LineWidth::try_from(80).unwrap());

    let Ok(formatted) = format_node(options, &parsed.syntax()) else {
        return display.to_string();
    };
    let Ok(output) = formatted.print() else {
        return display.to_string();
    };
    let code = output.as_code();

    // Strip the "type t = " prefix and trailing ";\n"
    let stripped = code.strip_prefix("type t = ").unwrap_or(code);
    let stripped = stripped.trim_end();
    let stripped = stripped.strip_suffix(';').unwrap_or(stripped);
    stripped.to_string()
}
