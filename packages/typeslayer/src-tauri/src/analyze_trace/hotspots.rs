use crate::analyze_trace::types::{
    AnalyzeTraceOptions, EventSpan, EventSpanEvent, HotSpot, HotType,
};
use crate::validate::types_json::{ResolvedType, TypesJsonSchema};
use std::collections::HashMap;
use std::path::Path;

pub type TypeRegistry = HashMap<i64, ResolvedType>;

pub fn create_type_registry(types_file: &TypesJsonSchema) -> TypeRegistry {
    let mut registry = HashMap::new();
    for resolved_type in types_file.iter() {
        registry.insert(resolved_type.id, resolved_type.clone());
    }
    registry
}

pub fn get_hotspots(
    hot_paths_tree: &EventSpan,
    options: &AnalyzeTraceOptions,
) -> Result<Vec<HotSpot>, String> {
    get_hotspots_worker(hot_paths_tree, None, options)
}

fn get_hotspots_worker(
    span: &EventSpan,
    current_file: Option<String>,
    options: &AnalyzeTraceOptions,
) -> Result<Vec<HotSpot>, String> {
    let mut current_file = current_file;

    // Update current file if this is a check event
    if let EventSpanEvent::TraceEvent(event) = &span.event {
        if event.cat == "check" {
            if let Some(path) = event.args.get("path").and_then(|v| v.as_str()) {
                current_file = Some(path.to_string());
            }
        }
    }

    let mut children: Vec<HotSpot> = Vec::new();
    if !span.children.is_empty() {
        // Sort slow to fast
        let mut sorted_children = span.children.clone();
        sorted_children.sort_by(|a, b| b.duration.partial_cmp(&a.duration).unwrap());

        for child in &sorted_children {
            children.extend(get_hotspots_worker(
                child,
                current_file.clone(),
                options,
            )?);
        }
    }

    // Check if this is not the root node
    if let EventSpanEvent::TraceEvent(_) = &span.event {
        if let Some(hot_frame) = make_hot_frame(span, children.clone())? {
            return Ok(vec![hot_frame]);
        }
    }

    Ok(children)
}

fn get_hot_type(id: i64, type_registry: &TypeRegistry) -> HotType {
    fn worker(id: i64, type_registry: &TypeRegistry, ancestor_ids: &mut Vec<i64>) -> HotType {
        if id == -1 {
            return HotType {
                resolved_type: ResolvedType {
                    id: -1,
                    display: Some("[Type Not Found]".to_string()),
                    flags: Vec::new(),
                    first_declaration: None,
                    symbol_name: None,
                    recursion_id: None,
                    is_tuple: None,
                    destructuring_pattern: None,
                    alias_type_arguments: None,
                    intrinsic_name: None,
                    reference_location: None,
                    alias_type: None,
                    conditional_check_type: None,
                    conditional_extends_type: None,
                    conditional_false_type: None,
                    conditional_true_type: None,
                    constraint_type: None,
                    evolving_array_element_type: None,
                    evolving_array_final_type: None,
                    indexed_access_index_type: None,
                    indexed_access_object_type: None,
                    instantiated_type: None,
                    keyof_type: None,
                    reverse_mapped_constraint_type: None,
                    reverse_mapped_mapped_type: None,
                    reverse_mapped_source_type: None,
                    substitution_base_type: None,
                    intersection_types: None,
                    type_arguments: None,
                    union_types: None,
                },
                children: Vec::new(),
            };
        }

        let resolved_type = match type_registry.get(&id) {
            Some(rt) => rt.clone(),
            None => {
                eprintln!("Type {} not found in registry", id);
                return HotType {
                    resolved_type: ResolvedType {
                        id,
                        display: Some(format!("[Type {} Not Found]", id)),
                        flags: Vec::new(),
                        first_declaration: None,
                        symbol_name: None,
                        recursion_id: None,
                        is_tuple: None,
                        destructuring_pattern: None,
                        alias_type_arguments: None,
                        intrinsic_name: None,
                        reference_location: None,
                        alias_type: None,
                        conditional_check_type: None,
                        conditional_extends_type: None,
                        conditional_false_type: None,
                        conditional_true_type: None,
                        constraint_type: None,
                        evolving_array_element_type: None,
                        evolving_array_final_type: None,
                        indexed_access_index_type: None,
                        indexed_access_object_type: None,
                        instantiated_type: None,
                        keyof_type: None,
                        reverse_mapped_constraint_type: None,
                        reverse_mapped_mapped_type: None,
                        reverse_mapped_source_type: None,
                        substitution_base_type: None,
                        intersection_types: None,
                        type_arguments: None,
                        union_types: None,
                    },
                    children: Vec::new(),
                };
            }
        };

        let mut children = Vec::new();

        // If there's a cycle, suppress the children, but not the type itself
        if !ancestor_ids.contains(&id) {
            ancestor_ids.push(id);

            // Process array type fields
            if let Some(alias_type_args) = &resolved_type.alias_type_arguments {
                for &type_id in alias_type_args {
                    children.push(worker(type_id, type_registry, ancestor_ids));
                }
            }
            if let Some(intersection_types) = &resolved_type.intersection_types {
                for &type_id in intersection_types {
                    children.push(worker(type_id, type_registry, ancestor_ids));
                }
            }
            if let Some(type_arguments) = &resolved_type.type_arguments {
                for &type_id in type_arguments {
                    children.push(worker(type_id, type_registry, ancestor_ids));
                }
            }
            if let Some(union_types) = &resolved_type.union_types {
                for &type_id in union_types {
                    children.push(worker(type_id, type_registry, ancestor_ids));
                }
            }

            // Process single type fields
            let single_type_fields = [
                resolved_type.alias_type,
                resolved_type.conditional_check_type,
                resolved_type.conditional_extends_type,
                resolved_type.conditional_false_type,
                resolved_type.conditional_true_type,
                resolved_type.constraint_type,
                resolved_type.evolving_array_element_type,
                resolved_type.evolving_array_final_type,
                resolved_type.indexed_access_index_type,
                resolved_type.indexed_access_object_type,
                resolved_type.instantiated_type,
                resolved_type.keyof_type,
                resolved_type.reverse_mapped_constraint_type,
                resolved_type.reverse_mapped_mapped_type,
                resolved_type.reverse_mapped_source_type,
                resolved_type.substitution_base_type,
            ];

            for type_id in single_type_fields.iter().filter_map(|&id| id) {
                children.push(worker(type_id, type_registry, ancestor_ids));
            }

            ancestor_ids.pop();
        }

        HotType {
            resolved_type,
            children,
        }
    }

    worker(id, type_registry, &mut Vec::new())
}

fn make_hot_frame(
    span: &EventSpan,
    children: Vec<HotSpot>,
) -> Result<Option<HotSpot>, String> {
    let time_ms = (span.duration / 1000.0).round() as i64;

    if let EventSpanEvent::TraceEvent(event) = &span.event {
        match event.name.as_str() {
            "checkSourceFile" => {
                let file_path = event
                    .args
                    .get("path")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let normalized_path = Path::new(file_path).to_string_lossy().to_string();

                Ok(Some(HotSpot {
                    description: format!("Check file {}", normalized_path),
                    time_ms,
                    path: Some(normalized_path),
                    children,
                    types: None,
                    start_line: None,
                    start_char: None,
                    start_offset: None,
                    end_line: None,
                    end_char: None,
                    end_offset: None,
                }))
            }
            "structuredTypeRelatedTo" => {
                let source_id = event
                    .args
                    .get("sourceId")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(-1);
                let target_id = event
                    .args
                    .get("targetId")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(-1);

                Ok(Some(HotSpot {
                    description: format!("Compare types {} and {}", source_id, target_id),
                    time_ms,
                    children,
                    types: Some(vec![source_id, target_id]),
                    path: None,
                    start_line: None,
                    start_char: None,
                    start_offset: None,
                    end_line: None,
                    end_char: None,
                    end_offset: None,
                }))
            }
            "getVariancesWorker" => {
                let id = event.args.get("id").and_then(|v| v.as_i64()).unwrap_or(-1);

                Ok(Some(HotSpot {
                    description: format!("Determine variance of type {}", id),
                    time_ms,
                    children,
                    types: Some(vec![id]),
                    path: None,
                    start_line: None,
                    start_char: None,
                    start_offset: None,
                    end_line: None,
                    end_char: None,
                    end_offset: None,
                }))
            }
            "checkExpression" | "checkVariableDeclaration" => {
                let path = event
                    .args
                    .get("path")
                    .and_then(|v| v.as_str())
                    .map(|p| Path::new(p).to_string_lossy().to_string());

                Ok(Some(HotSpot {
                    description: event.name.clone(),
                    time_ms,
                    path,
                    children: Vec::new(),
                    types: None,
                    start_line: None,
                    start_char: None,
                    start_offset: None,
                    end_line: None,
                    end_char: None,
                    end_offset: None,
                }))
            }
            _ => Ok(None),
        }
    } else {
        Ok(None)
    }
}
