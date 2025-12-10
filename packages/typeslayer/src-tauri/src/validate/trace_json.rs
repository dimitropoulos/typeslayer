use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const TRACE_JSON_FILENAME: &str = "trace.json";

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
            if positive && !(n.as_f64().unwrap_or(0.0) > 0.0) {
                return Err(format!("args.{key} must be positive"));
            }
            Ok(())
        }
        _ => Err(format!("args.{key} must be a number")),
    }
}

fn validate_event(event: &TraceEvent) -> Result<(), String> {
    if event.pid == 0 || event.tid == 0 || event.ts == 0.0 {
        return Err("pid, tid, ts must be positive".to_string());
    }

    let args_obj = validate_args_object(&event.args)?;

    match event.name.as_str() {
        // METADATA
        "TracingStartedInBrowser" => {
            if event.cat != "disabled-by-default-devtools.timeline"
                || event.ph.as_deref() != Some("M")
            {
                return Err("TracingStartedInBrowser invalid cat or ph".to_string());
            }
        }
        "process_name" => {
            if event.cat != "__metadata" || event.ph.as_deref() != Some("M") {
                return Err("process_name invalid cat or ph".to_string());
            }
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

        // PARSE
        "createSourceFile" => {
            if event.cat != "parse" {
                return Err("createSourceFile cat must be 'parse'".to_string());
            }
            if event.ph.is_none() {
                return Err("createSourceFile requires ph".to_string());
            }
            expect_string_field(args_obj, "path")?;
        }
        "parseJsonSourceFileConfigFileContent" => {
            if event.cat != "parse" {
                return Err("parseJsonSourceFileConfigFileContent cat must be 'parse'".to_string());
            }
            if event.dur.is_none() {
                return Err("parseJsonSourceFileConfigFileContent must have dur".to_string());
            }
            expect_string_field(args_obj, "path")?;
        }

        // PROGRAM
        "createProgram" => {
            if event.cat != "program" {
                return Err("createProgram cat must be 'program'".to_string());
            }
            if event.ph.is_none() {
                return Err("createProgram requires ph".to_string());
            }
            expect_string_field(args_obj, "configFilePath")?;
        }
        "findSourceFile" => {
            if event.cat != "program" {
                return Err("findSourceFile cat must be 'program'".to_string());
            }
            if event.dur.is_none() {
                return Err("findSourceFile must have dur".to_string());
            }
            expect_string_field(args_obj, "fileName")?;
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
        "processTypeReferenceDirective" => {
            if event.cat != "program" {
                return Err("processTypeReferenceDirective cat must be 'program'".to_string());
            }
            if event.dur.is_none() {
                return Err("processTypeReferenceDirective must have dur".to_string());
            }
            expect_string_field(args_obj, "directive")?;
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
            expect_string_field(args_obj, "resolveFrom")?;
        }
        "resolveModuleNamesWorker" => {
            if event.cat != "program" {
                return Err("resolveModuleNamesWorker cat must be 'program'".to_string());
            }
            expect_string_field(args_obj, "containingFileName")?;
        }
        "resolveTypeReferenceDirectiveNamesWorker" => {
            if event.cat != "program" {
                return Err(
                    "resolveTypeReferenceDirectiveNamesWorker cat must be 'program'".to_string(),
                );
            }
            expect_string_field(args_obj, "containingFileName")?;
        }
        "shouldProgramCreateNewSourceFiles" => {
            if event.cat != "program" {
                return Err("shouldProgramCreateNewSourceFiles cat must be 'program'".to_string());
            }
            if event.ph.as_deref() != Some("I") {
                return Err("shouldProgramCreateNewSourceFiles must be instant".to_string());
            }
            if event.s.is_none() {
                return Err("shouldProgramCreateNewSourceFiles requires scope 's'".to_string());
            }
            if args_obj.get("hasOldProgram").is_none() {
                return Err("hasOldProgram missing".to_string());
            }
        }
        "tryReuseStructureFromOldProgram" => {
            if event.cat != "program" {
                return Err("tryReuseStructureFromOldProgram cat must be 'program'".to_string());
            }
            if event.dur.is_none() {
                return Err("tryReuseStructureFromOldProgram must have dur".to_string());
            }
        }

        // BIND
        "bindSourceFile" => {
            if event.cat != "bind" {
                return Err("bindSourceFile cat must be 'bind'".to_string());
            }
            if event.ph.is_none() {
                return Err("bindSourceFile requires ph".to_string());
            }
            expect_string_field(args_obj, "path")?;
        }

        // CHECK
        "checkExpression" => {
            if event.cat != "check" {
                return Err("checkExpression cat must be 'check'".to_string());
            }
            if event.dur.is_none() {
                return Err("checkExpression must have dur".to_string());
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
        "checkVariableDeclaration" => {
            if event.cat != "check" {
                return Err("checkVariableDeclaration cat must be 'check'".to_string());
            }
            if event.dur.is_none() {
                return Err("checkVariableDeclaration must have dur".to_string());
            }
            expect_number_field(args_obj, "kind", false)?;
            expect_number_field(args_obj, "pos", false)?;
            expect_number_field(args_obj, "end", false)?;
            expect_string_field(args_obj, "path")?;
        }
        "checkDeferredNode" => {
            if event.cat != "check" {
                return Err("checkDeferredNode cat must be 'check'".to_string());
            }
            if event.dur.is_none() {
                return Err("checkDeferredNode must have dur".to_string());
            }
            expect_number_field(args_obj, "kind", false)?;
            expect_number_field(args_obj, "pos", false)?;
            expect_number_field(args_obj, "end", false)?;
            expect_string_field(args_obj, "path")?;
        }
        "checkSourceFileNodes" => {
            if event.cat != "check" {
                return Err("checkSourceFileNodes cat must be 'check'".to_string());
            }
            if event.dur.is_none() {
                return Err("checkSourceFileNodes must have dur".to_string());
            }
            expect_string_field(args_obj, "path")?;
        }

        // CHECKTYPES
        "checkTypeParameterDeferred" => {
            if event.cat != "checkTypes" {
                return Err("checkTypeParameterDeferred cat must be 'checkTypes'".to_string());
            }
            if event.dur.is_none() {
                return Err("checkTypeParameterDeferred must have dur".to_string());
            }
            expect_number_field(args_obj, "parent", true)?;
            expect_number_field(args_obj, "id", true)?;
        }
        "getVariancesWorker" => {
            if event.cat != "checkTypes" {
                return Err("getVariancesWorker cat must be 'checkTypes'".to_string());
            }
            if event.dur.is_none() {
                return Err("getVariancesWorker must have dur".to_string());
            }
            expect_number_field(args_obj, "arity", true)?;
            expect_number_field(args_obj, "id", true)?;
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

        // CHECKTYPES DEPTH LIMITS
        "checkCrossProductUnion_DepthLimit" => {
            if event.cat != "checkTypes" {
                return Err(
                    "checkCrossProductUnion_DepthLimit cat must be 'checkTypes'".to_string()
                );
            }
            if event.ph.as_deref() != Some("I") {
                return Err("checkCrossProductUnion_DepthLimit must be instant".to_string());
            }
            if event.s.is_none() {
                return Err("checkCrossProductUnion_DepthLimit requires scope 's'".to_string());
            }
            match args_obj.get("typeIds") {
                Some(Value::Array(arr)) => {
                    if arr.is_empty() {
                        return Err("args.typeIds must be non-empty array".to_string());
                    }
                    for t in arr {
                        if !t.is_number() {
                            return Err("typeIds entries must be numbers".to_string());
                        }
                    }
                }
                _ => return Err("args.types must be array".to_string()),
            }
            expect_number_field(args_obj, "size", true)?;
        }
        "checkTypeRelatedTo_DepthLimit" => {
            if event.cat != "checkTypes" {
                return Err("checkTypeRelatedTo_DepthLimit cat must be 'checkTypes'".to_string());
            }
            if event.ph.as_deref() != Some("I") {
                return Err("checkTypeRelatedTo_DepthLimit must be instant".to_string());
            }
            if event.s.is_none() {
                return Err("checkTypeRelatedTo_DepthLimit requires scope 's'".to_string());
            }
            expect_number_field(args_obj, "sourceId", false)?;
            expect_number_field(args_obj, "targetId", false)?;
            expect_number_field(args_obj, "depth", true)?;
            expect_number_field(args_obj, "targetDepth", true)?;
        }
        "getTypeAtFlowNode_DepthLimit" => {
            if event.cat != "checkTypes" {
                return Err("getTypeAtFlowNode_DepthLimit cat must be 'checkTypes'".to_string());
            }
            if event.ph.as_deref() != Some("I") {
                return Err("getTypeAtFlowNode_DepthLimit must be instant".to_string());
            }
            if event.s.is_none() {
                return Err("getTypeAtFlowNode_DepthLimit requires scope 's'".to_string());
            }
            expect_number_field(args_obj, "flowId", true)?;
        }
        "instantiateType_DepthLimit" => {
            if event.cat != "checkTypes" {
                return Err("instantiateType_DepthLimit cat must be 'checkTypes'".to_string());
            }
            if event.ph.as_deref() != Some("I") {
                return Err("instantiateType_DepthLimit must be instant".to_string());
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
            if event.ph.as_deref() != Some("I") {
                return Err("recursiveTypeRelatedTo_DepthLimit must be instant".to_string());
            }
            if event.s.is_none() {
                return Err("recursiveTypeRelatedTo_DepthLimit requires scope 's'".to_string());
            }
            expect_number_field(args_obj, "sourceId", false)?;
            expect_number_field(args_obj, "targetId", false)?;
            expect_number_field(args_obj, "depth", true)?;
            expect_number_field(args_obj, "targetDepth", true)?;
            for key in ["sourceIdStack", "targetIdStack"] {
                match args_obj.get(key) {
                    Some(Value::Array(_)) => {}
                    _ => return Err(format!("{key} must be array")),
                }
            }
        }
        "removeSubtypes_DepthLimit" => {
            if event.cat != "checkTypes" {
                return Err("removeSubtypes_DepthLimit cat must be 'checkTypes'".to_string());
            }
            if event.ph.as_deref() != Some("I") {
                return Err("removeSubtypes_DepthLimit must be instant".to_string());
            }
            if event.s.is_none() {
                return Err("removeSubtypes_DepthLimit requires scope 's'".to_string());
            }
            match args_obj.get("typeIds") {
                Some(Value::Array(arr)) => {
                    if arr.is_empty() {
                        return Err("args.typeIds must be non-empty array".to_string());
                    }
                    for t in arr {
                        if !t.is_number() {
                            return Err("typeIds entries must be numbers".to_string());
                        }
                    }
                }
                _ => return Err("args.typeIds must be array".to_string()),
            }
        }
        "traceUnionsOrIntersectionsTooLarge_DepthLimit" => {
            if event.cat != "checkTypes" {
                return Err(
                    "traceUnionsOrIntersectionsTooLarge_DepthLimit cat must be 'checkTypes'"
                        .to_string(),
                );
            }
            if event.ph.as_deref() != Some("I") {
                return Err(
                    "traceUnionsOrIntersectionsTooLarge_DepthLimit must be instant".to_string(),
                );
            }
            if event.s.is_none() {
                return Err(
                    "traceUnionsOrIntersectionsTooLarge_DepthLimit requires scope 's'".to_string(),
                );
            }
            expect_number_field(args_obj, "sourceId", false)?;
            expect_number_field(args_obj, "sourceSize", true)?;
            expect_number_field(args_obj, "targetId", false)?;
            expect_number_field(args_obj, "targetSize", true)?;
            if let Some(v) = args_obj.get("pos") {
                if !v.is_number() {
                    return Err("args.pos must be a number".to_string());
                }
            }
            if let Some(v) = args_obj.get("end") {
                if !v.is_number() {
                    return Err("args.end must be a number".to_string());
                }
            }
        }
        "typeRelatedToDiscriminatedType_DepthLimit" => {
            if event.cat != "checkTypes" {
                return Err(
                    "typeRelatedToDiscriminatedType_DepthLimit cat must be 'checkTypes'"
                        .to_string(),
                );
            }
            if event.ph.as_deref() != Some("I") {
                return Err("typeRelatedToDiscriminatedType_DepthLimit must be instant".to_string());
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

        // EMIT
        "emit" => {
            if event.cat != "emit" {
                return Err("emit cat must be 'emit'".to_string());
            }
            if event.ph.is_none() {
                return Err("emit requires ph".to_string());
            }
        }
        "emitBuildInfo" => {
            if event.cat != "emit" {
                return Err("emitBuildInfo cat must be 'emit'".to_string());
            }
        }
        "emitDeclarationFileOrBundle" => {
            if event.cat != "emit" {
                return Err("emitDeclarationFileOrBundle cat must be 'emit'".to_string());
            }
            if event.dur.is_none() {
                return Err("emitDeclarationFileOrBundle must have dur".to_string());
            }
            expect_string_field(args_obj, "declarationFilePath")?;
        }
        "emitJsFileOrBundle" => {
            if event.cat != "emit" {
                return Err("emitJsFileOrBundle cat must be 'emit'".to_string());
            }
            if event.dur.is_none() {
                return Err("emitJsFileOrBundle must have dur".to_string());
            }
            expect_string_field(args_obj, "jsFilePath")?;
        }
        "transformNodes" => {
            if event.cat != "emit" {
                return Err("transformNodes cat must be 'emit'".to_string());
            }
            if event.dur.is_none() {
                return Err("transformNodes must have dur".to_string());
            }
            expect_string_field(args_obj, "path")?;
        }

        // SESSION
        "cancellationThrown" => {
            if event.cat != "session" {
                return Err("cancellationThrown cat must be 'session'".to_string());
            }
            if event.ph.as_deref() != Some("I") {
                return Err("cancellationThrown must be instant".to_string());
            }
            if let Some(Value::String(_)) = args_obj.get("kind") {
            } else {
                return Err("args.kind must be string".to_string());
            }
        }
        "commandCanceled" => {
            if event.cat != "session" {
                return Err("commandCanceled cat must be 'session'".to_string());
            }
            if event.ph.as_deref() != Some("I") {
                return Err("commandCanceled must be instant".to_string());
            }
            expect_number_field(args_obj, "seq", false)?;
            expect_string_field(args_obj, "command")?;
        }
        "commandError" => {
            if event.cat != "session" {
                return Err("commandError cat must be 'session'".to_string());
            }
            if event.ph.as_deref() != Some("I") {
                return Err("commandError must be instant".to_string());
            }
            expect_number_field(args_obj, "seq", false)?;
            expect_string_field(args_obj, "command")?;
            expect_string_field(args_obj, "message")?;
        }
        "createConfiguredProject" => {
            if event.cat != "session" {
                return Err("createConfiguredProject cat must be 'session'".to_string());
            }
            if event.ph.as_deref() != Some("I") {
                return Err("createConfiguredProject must be instant".to_string());
            }
            expect_string_field(args_obj, "configFilePath")?;
        }
        "createdDocumentRegistryBucket" => {
            if event.cat != "session" {
                return Err("createdDocumentRegistryBucket cat must be 'session'".to_string());
            }
            if event.ph.as_deref() != Some("I") {
                return Err("createdDocumentRegistryBucket must be instant".to_string());
            }
            expect_string_field(args_obj, "configFilePath")?;
            expect_string_field(args_obj, "key")?;
        }
        "documentRegistryBucketOverlap" => {
            if event.cat != "session" {
                return Err("documentRegistryBucketOverlap cat must be 'session'".to_string());
            }
            if event.ph.as_deref() != Some("I") {
                return Err("documentRegistryBucketOverlap must be instant".to_string());
            }
            expect_string_field(args_obj, "path")?;
            expect_string_field(args_obj, "key1")?;
            expect_string_field(args_obj, "key2")?;
        }
        "executeCommand" => {
            if event.cat != "session" {
                return Err("executeCommand cat must be 'session'".to_string());
            }
            if event.ph.is_none() {
                return Err("executeCommand requires ph".to_string());
            }
            expect_number_field(args_obj, "seq", false)?;
            expect_string_field(args_obj, "command")?;
        }
        "finishCachingPerDirectoryResolution" => {
            if event.cat != "session" {
                return Err("finishCachingPerDirectoryResolution cat must be 'session'".to_string());
            }
            if event.ph.as_deref() != Some("I") {
                return Err("finishCachingPerDirectoryResolution must be instant".to_string());
            }
            if event.s.is_none() {
                return Err("finishCachingPerDirectoryResolution requires scope 's'".to_string());
            }
        }
        "getPackageJsonAutoImportProvider" => {
            if event.cat != "session" {
                return Err("getPackageJsonAutoImportProvider cat must be 'session'".to_string());
            }
            if event.dur.is_none() {
                return Err("getPackageJsonAutoImportProvider must have dur".to_string());
            }
        }
        "getUnresolvedImports" => {
            if event.cat != "session" {
                return Err("getUnresolvedImports cat must be 'session'".to_string());
            }
            if event.dur.is_none() {
                return Err("getUnresolvedImports must have dur".to_string());
            }
            expect_number_field(args_obj, "count", false)?;
        }
        "loadConfiguredProject" => {
            if event.cat != "session" {
                return Err("loadConfiguredProject cat must be 'session'".to_string());
            }
            if event.ph.is_none() {
                return Err("loadConfiguredProject requires ph".to_string());
            }
            expect_string_field(args_obj, "configFilePath")?;
        }
        "regionSemanticCheck" => {
            if event.cat != "session" {
                return Err("regionSemanticCheck cat must be 'session'".to_string());
            }
            if event.ph.is_none() {
                return Err("regionSemanticCheck requires ph".to_string());
            }
            expect_string_field(args_obj, "file")?;
            expect_string_field(args_obj, "configFilePath")?;
        }
        "request" => {
            if event.cat != "session" {
                return Err("request cat must be 'session'".to_string());
            }
            if event.ph.as_deref() != Some("I") {
                return Err("request must be instant".to_string());
            }
            expect_number_field(args_obj, "seq", false)?;
            expect_string_field(args_obj, "command")?;
        }
        "response" => {
            if event.cat != "session" {
                return Err("response cat must be 'session'".to_string());
            }
            if event.ph.as_deref() != Some("I") {
                return Err("response must be instant".to_string());
            }
            expect_number_field(args_obj, "seq", false)?;
            expect_string_field(args_obj, "command")?;
            match args_obj.get("success") {
                Some(Value::Bool(_)) => {}
                _ => return Err("args.success must be boolean".to_string()),
            }
        }
        "semanticCheck" => {
            if event.cat != "session" {
                return Err("semanticCheck cat must be 'session'".to_string());
            }
            if event.ph.is_none() {
                return Err("semanticCheck requires ph".to_string());
            }
            expect_string_field(args_obj, "file")?;
            expect_string_field(args_obj, "configFilePath")?;
        }
        "stepAction" => {
            if event.cat != "session" {
                return Err("stepAction cat must be 'session'".to_string());
            }
            if event.ph.as_deref() != Some("I") {
                return Err("stepAction must be instant".to_string());
            }
            if event.s.is_none() {
                return Err("stepAction requires scope 's'".to_string());
            }
            expect_number_field(args_obj, "seq", false)?;
        }
        "stepCanceled" => {
            if event.cat != "session" {
                return Err("stepCanceled cat must be 'session'".to_string());
            }
            if event.ph.as_deref() != Some("I") {
                return Err("stepCanceled must be instant".to_string());
            }
            expect_number_field(args_obj, "seq", false)?;
        }
        "stepError" => {
            if event.cat != "session" {
                return Err("stepError cat must be 'session'".to_string());
            }
            if event.ph.as_deref() != Some("I") {
                return Err("stepError must be instant".to_string());
            }
            expect_number_field(args_obj, "seq", false)?;
            expect_string_field(args_obj, "message")?;
        }
        "suggestionCheck" => {
            if event.cat != "session" {
                return Err("suggestionCheck cat must be 'session'".to_string());
            }
            if event.ph.is_none() {
                return Err("suggestionCheck requires ph".to_string());
            }
            expect_string_field(args_obj, "file")?;
            expect_string_field(args_obj, "configFilePath")?;
        }
        "syntacticCheck" => {
            if event.cat != "session" {
                return Err("syntacticCheck cat must be 'session'".to_string());
            }
            if event.ph.is_none() {
                return Err("syntacticCheck requires ph".to_string());
            }
            expect_string_field(args_obj, "file")?;
            expect_string_field(args_obj, "configFilePath")?;
        }
        "updateGraph" => {
            if event.cat != "session" {
                return Err("updateGraph cat must be 'session'".to_string());
            }
            if event.ph.is_none() {
                return Err("updateGraph requires ph".to_string());
            }
            expect_string_field(args_obj, "name")?;
            if args_obj.get("kind").is_none() {
                return Err("kind missing".to_string());
            }
        }

        other => return Err(format!("Unknown event name '{other}'")),
    }
    Ok(())
}

fn get_context_lines(contents: &str, error_line: usize) -> String {
    let lines: Vec<&str> = contents.lines().collect();
    let mut context = String::new();

    if error_line > 1 {
        if let Some(prev) = lines.get(error_line - 2) {
            context.push_str(&format!("Line {}: {}\n", error_line - 1, prev));
        }
    }

    if let Some(err_line) = lines.get(error_line - 1) {
        context.push_str(&format!("Line {} (ERROR): {}\n", error_line, err_line));
    }

    if let Some(next) = lines.get(error_line) {
        context.push_str(&format!("Line {}: {}\n", error_line + 1, next));
    }

    context
}

pub fn parse_trace_json(path_label: &str, contents: &str) -> Result<Vec<TraceEvent>, String> {
    let raw: Value = serde_json::from_str(contents).map_err(|e| {
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
        validate_event(&ev).map_err(|e| {
            let event_json = serde_json::to_string_pretty(&ev)
                .unwrap_or_else(|_| "<failed to serialize event>".to_string());
            format!("trace.json event[{i}] validation error: {e}\nExpected type: {event_json}")
        })?;
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
