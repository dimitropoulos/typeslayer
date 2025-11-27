use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const TRACE_JSON_FILENAME: &str = "trace.json";

// Generic representation of a trace event. We'll apply manual validation matching
// the TS zod schema after deserialization.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TraceEvent {
    pub pid: u64,
    pub tid: u64,
    pub ts: f64,
    pub name: String,
    pub cat: String,
    #[serde(default)]
    pub ph: Option<String>,
    #[serde(default)]
    pub dur: Option<f64>,
    #[serde(default)]
    pub s: Option<String>,
    #[serde(default = "default_args")]
    pub args: Value,
}

fn default_args() -> Value {
    Value::Object(serde_json::Map::new())
}

fn validate_args_object(args: &Value) -> Result<&serde_json::Map<String, Value>, String> {
    match args {
        Value::Object(map) => Ok(map),
        _ => Err("args must be an object".to_string()),
    }
}

fn expect_string_field(map: &serde_json::Map<String, Value>, key: &str) -> Result<(), String> {
    match map.get(key) {
        Some(Value::String(_)) => Ok(()),
        _ => Err(format!("args.{key} must be a string")),
    }
}

fn expect_number_field(
    map: &serde_json::Map<String, Value>,
    key: &str,
    positive: bool,
) -> Result<(), String> {
    match map.get(key) {
        Some(Value::Number(n)) => {
            // Accept integer or float; use as_f64 for positivity check
            if positive && !(n.as_f64().unwrap_or(0.0) > 0.0) {
                return Err(format!("args.{key} must be positive"));
            }
            Ok(())
        }
        _ => Err(format!("args.{key} must be a number")),
    }
}

fn validate_event(event: &TraceEvent) -> Result<(), String> {
    // Common invariants
    if event.pid == 0 || event.tid == 0 || event.ts == 0.0 {
        return Err("pid, tid, ts must be positive".to_string());
    }

    let args_obj = validate_args_object(&event.args)?;

    match event.name.as_str() {
        // Metadata events
        "process_name" => {
            if event.cat != "__metadata" || event.ph.as_deref() != Some("M") {
                return Err("process_name invalid cat or ph".to_string());
            }
            // args.name must equal "tsc"
            match args_obj.get("name") {
                Some(Value::String(s)) if s == "tsc" => {}
                _ => return Err("process_name args.name must be 'tsc'".to_string()),
            }
        }
        "thread_name" => {
            if event.cat != "__metadata" || event.ph.as_deref() != Some("M") {
                return Err("thread_name invalid cat or ph".to_string());
            }
            match args_obj.get("name") {
                Some(Value::String(s)) if s == "Main" => {}
                _ => return Err("thread_name args.name must be 'Main'".to_string()),
            }
        }
        "TracingStartedInBrowser" => {
            if event.cat != "disabled-by-default-devtools.timeline"
                || event.ph.as_deref() != Some("M")
            {
                return Err("TracingStartedInBrowser invalid cat or ph".to_string());
            }
        }
        // Bind phase
        "bindSourceFile" => {
            if event.cat != "bind" {
                return Err("bindSourceFile cat must be 'bind'".to_string());
            }
            if event.ph.is_none() {
                return Err("bindSourceFile ph must be B or E".to_string());
            }
            expect_string_field(args_obj, "path")?;
        }
        // Check phase (complete or duration events)
        "checkExpression" | "checkVariableDeclaration" | "checkDeferredNode" => {
            if event.cat != "check" {
                return Err(format!("{0} cat must be 'check'", event.name));
            }
            if event.dur.is_none() {
                return Err(format!("{0} must have dur", event.name));
            }
            expect_number_field(args_obj, "kind", false)?;
            expect_number_field(args_obj, "pos", false)?;
            expect_number_field(args_obj, "end", false)?;
        }
        "checkSourceFile" => {
            if event.cat != "check" {
                return Err("checkSourceFile cat must be 'check'".to_string());
            }
            if event.ph.is_none() {
                return Err("checkSourceFile requires ph".to_string());
            }
            expect_string_field(args_obj, "path")?;
        }
        // checkTypes phase subset
        "getVariancesWorker" => {
            if event.cat != "checkTypes" {
                return Err("getVariancesWorker cat must be 'checkTypes'".to_string());
            }
            if event.dur.is_none() {
                return Err("getVariancesWorker must have dur".to_string());
            }
            expect_number_field(args_obj, "arity", true)?;
            expect_number_field(args_obj, "id", true)?;
            // results.variances array of strings
            match args_obj.get("results") {
                Some(Value::Object(o)) => match o.get("variances") {
                    Some(Value::Array(arr)) => {
                        for v in arr {
                            if !v.is_string() {
                                return Err("variance must be string".to_string());
                            }
                        }
                    }
                    _ => return Err("results.variances must be array".to_string()),
                },
                _ => return Err("results must be object".to_string()),
            }
        }
        "structuredTypeRelatedTo" => {
            if event.cat != "checkTypes" {
                return Err("structuredTypeRelatedTo cat must be 'checkTypes'".to_string());
            }
            if event.dur.is_none() {
                return Err("structuredTypeRelatedTo must have dur".to_string());
            }
            expect_number_field(args_obj, "sourceId", true)?;
            expect_number_field(args_obj, "targetId", true)?;
        }
        "instantiateType_DepthLimit" => {
            if event.cat != "checkTypes" {
                return Err("instantiateType_DepthLimit cat must be 'checkTypes'".to_string());
            }
            if event.s.is_none() {
                return Err("instantiateType_DepthLimit requires scope 's'".to_string());
            }
            expect_number_field(args_obj, "typeId", false)?;
            expect_number_field(args_obj, "instantiationDepth", false)?;
            expect_number_field(args_obj, "instantiationCount", true)?;
        }
        "recursiveTypeRelatedTo_DepthLimit" => {
            if event.cat != "checkTypes" {
                return Err(
                    "recursiveTypeRelatedTo_DepthLimit cat must be 'checkTypes'".to_string()
                );
            }
            if event.s.is_none() {
                return Err("recursiveTypeRelatedTo_DepthLimit requires scope 's'".to_string());
            }
            expect_number_field(args_obj, "sourceId", false)?;
            expect_number_field(args_obj, "targetId", false)?;
            expect_number_field(args_obj, "depth", true)?;
            expect_number_field(args_obj, "targetDepth", true)?;
        }
        "typeRelatedToDiscriminatedType_DepthLimit" => {
            if event.cat != "checkTypes" {
                return Err(
                    "typeRelatedToDiscriminatedType_DepthLimit cat must be 'checkTypes'"
                        .to_string(),
                );
            }
            if event.s.is_none() {
                return Err(
                    "typeRelatedToDiscriminatedType_DepthLimit requires scope 's'".to_string(),
                );
            }
            expect_number_field(args_obj, "sourceId", false)?;
            expect_number_field(args_obj, "targetId", false)?;
            expect_number_field(args_obj, "numCombinations", true)?;
        }
        // Program
        "createProgram" => {
            if event.cat != "program" {
                return Err("createProgram cat must be 'program'".to_string());
            }
            if event.ph.is_none() {
                return Err("createProgram requires ph".to_string());
            }
            expect_string_field(args_obj, "configFilePath")?;
        }
        "findSourceFile"
        | "processTypeReferenceDirective"
        | "resolveModuleNamesWorker"
        | "resolveTypeReferenceDirectiveNamesWorker" => {
            if event.cat != "program" {
                return Err(format!("{0} cat must be 'program'", event.name));
            }
            if event.dur.is_none() {
                return Err(format!("{0} must have dur", event.name));
            }
            // fields vary; basic check for at least one string path-like field
        }
        "processRootFiles" => {
            if event.cat != "program" {
                return Err("processRootFiles cat must be 'program'".to_string());
            }
            if event.dur.is_none() {
                return Err("processRootFiles must have dur".to_string());
            }
            expect_number_field(args_obj, "count", true)?;
        }
        "processTypeReferences" => {
            if event.cat != "program" {
                return Err("processTypeReferences cat must be 'program'".to_string());
            }
            if event.dur.is_none() {
                return Err("processTypeReferences must have dur".to_string());
            }
            expect_number_field(args_obj, "count", true)?;
        }
        "resolveLibrary" => {
            if event.cat != "program" {
                return Err("resolveLibrary cat must be 'program'".to_string());
            }
            if event.dur.is_none() {
                return Err("resolveLibrary must have dur".to_string());
            }
            expect_string_field(args_obj, "resolveFrom")?;
        }
        // Parse
        "createSourceFile" => {
            if event.cat != "parse" {
                return Err("createSourceFile cat must be 'parse'".to_string());
            }
            if event.ph.is_none() {
                return Err("createSourceFile requires ph".to_string());
            }
            expect_string_field(args_obj, "path")?;
        }
        // Emit
        "emit" => {
            if event.cat != "emit" {
                return Err("emit cat must be 'emit'".to_string());
            }
            if event.ph.is_none() {
                return Err("emit requires ph".to_string());
            }
        }
        "emitJsFileOrBundle" | "transformNodes" | "emitDeclarationFileOrBundle" => {
            if event.cat != "emit" {
                return Err(format!("{0} cat must be 'emit'", event.name));
            }
            if event.dur.is_none() {
                return Err(format!("{0} must have dur", event.name));
            }
        }
        "emitBuildInfo" => {
            if event.cat != "emit" {
                return Err("emitBuildInfo cat must be 'emit'".to_string());
            }
            // ph can be B/E/X; dur optional
        }
        other => return Err(format!("Unknown event name '{other}'")),
    }
    Ok(())
}

fn get_context_lines(contents: &str, error_line: usize) -> String {
    let lines: Vec<&str> = contents.lines().collect();
    let mut context = String::new();

    // Show line before (if exists)
    if error_line > 1 {
        if let Some(prev) = lines.get(error_line - 2) {
            context.push_str(&format!("Line {}: {}\n", error_line - 1, prev));
        }
    }

    // Show error line
    if let Some(err_line) = lines.get(error_line - 1) {
        context.push_str(&format!("Line {} (ERROR): {}\n", error_line, err_line));
    }

    // Show line after (if exists)
    if let Some(next) = lines.get(error_line) {
        context.push_str(&format!("Line {}: {}\n", error_line + 1, next));
    }

    context
}

pub fn parse_trace_json(path_label: &str, contents: &str) -> Result<Vec<TraceEvent>, String> {
    let raw: Value = serde_json::from_str(contents).map_err(|e| {
        // Try to extract line number from error message
        let error_msg = format!("{e}");
        if let Some(line_str) = error_msg.split("line ").nth(1) {
            if let Some(line_num_str) = line_str.split_whitespace().next() {
                if let Ok(line_num) = line_num_str.parse::<usize>() {
                    let context = get_context_lines(contents, line_num);
                    return format!("Failed to parse {path_label}: {e}\n\nContext:\n{context}");
                }
            }
        }
        format!("Failed to parse {path_label}: {e}")
    })?;
    let arr = match raw {
        Value::Array(a) => a,
        _ => return Err("trace.json root is not an array".to_string()),
    };
    let mut events: Vec<TraceEvent> = Vec::with_capacity(arr.len());
    for (i, v) in arr.into_iter().enumerate() {
        let ev: TraceEvent = serde_json::from_value(v)
            .map_err(|e| format!("trace.json event[{i}] structural error: {e}"))?;
        validate_event(&ev).map_err(|e| format!("trace.json event[{i}] validation error: {e}"))?;
        events.push(ev);
    }
    Ok(events)
}

pub async fn read_trace_json(path: &str) -> Result<Vec<TraceEvent>, String> {
    let contents = tokio::fs::read_to_string(path)
        .await
        .map_err(|e| format!("Failed to read trace.json at {path}: {e}"))?;
    parse_trace_json(path, &contents)
}
