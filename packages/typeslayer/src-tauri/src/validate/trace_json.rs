use std::{io::BufReader, path::PathBuf};

use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const TRACE_JSON_FILENAME: &str = "trace.json";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub enum EventName {
    // Metadata events
    TracingStartedInBrowser,
    #[serde(rename = "process_name")]
    ProcessName,
    #[serde(rename = "thread_name")]
    ThreadName,

    // Parse phase events
    CreateSourceFile,
    ParseJsonSourceFileConfigFileContent,

    // Program phase events
    CreateProgram,
    FindSourceFile,
    ProcessRootFiles,
    ProcessTypeReferenceDirective,
    ProcessTypeReferences,
    ResolveLibrary,
    ResolveModuleNamesWorker,
    ResolveTypeReferenceDirectiveNamesWorker,
    ShouldProgramCreateNewSourceFiles,
    TryReuseStructureFromOldProgram,

    // Bind phase events
    BindSourceFile,

    // Check phase events
    CheckExpression,
    CheckSourceFile,
    CheckVariableDeclaration,
    CheckDeferredNode,
    CheckSourceFileNodes,

    // CheckTypes phase events
    CheckTypeParameterDeferred,
    GetVariancesWorker,
    StructuredTypeRelatedTo,

    // CheckTypes depth limit events
    #[serde(rename = "checkCrossProductUnion_DepthLimit")]
    CheckCrossProductUnionDepthLimit,
    #[serde(rename = "checkTypeRelatedTo_DepthLimit")]
    CheckTypeRelatedToDepthLimit,
    #[serde(rename = "getTypeAtFlowNode_DepthLimit")]
    GetTypeAtFlowNodeDepthLimit,
    #[serde(rename = "instantiateType_DepthLimit")]
    InstantiateTypeDepthLimit,
    #[serde(rename = "recursiveTypeRelatedTo_DepthLimit")]
    RecursiveTypeRelatedToDepthLimit,
    #[serde(rename = "removeSubtypes_DepthLimit")]
    RemoveSubtypesDepthLimit,
    #[serde(rename = "traceUnionsOrIntersectionsTooLarge_DepthLimit")]
    TraceUnionsOrIntersectionsTooLargeDepthLimit,
    #[serde(rename = "typeRelatedToDiscriminatedType_DepthLimit")]
    TypeRelatedToDiscriminatedTypeDepthLimit,

    // Emit phase events
    Emit,
    EmitBuildInfo,
    EmitDeclarationFileOrBundle,
    EmitJsFileOrBundle,
    TransformNodes,

    // Session phase events
    CancellationThrown,
    CommandCanceled,
    CommandError,
    CreateConfiguredProject,
    CreatedDocumentRegistryBucket,
    DocumentRegistryBucketOverlap,
    ExecuteCommand,
    FinishCachingPerDirectoryResolution,
    GetPackageJsonAutoImportProvider,
    GetUnresolvedImports,
    LoadConfiguredProject,
    RegionSemanticCheck,
    Request,
    Response,
    SemanticCheck,
    StepAction,
    StepCanceled,
    StepError,
    SuggestionCheck,
    SyntacticCheck,
    UpdateGraph,
}

// Common event structures
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventCommon {
    pub pid: u64,
    pub tid: u64,
    pub ts: f64,
}

// Phase types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum EventPhase {
    #[serde(rename = "B")]
    Begin,
    #[serde(rename = "E")]
    End,
    #[serde(rename = "X")]
    Complete,
    #[serde(rename = "M")]
    Metadata,
    #[serde(rename = "I")]
    Instant,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum InstantScope {
    #[serde(rename = "t")]
    Thread,
    #[serde(rename = "g")]
    Global,
    #[serde(rename = "p")]
    Process,
}

// Metadata Events
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TracingStartedInBrowserArgs {}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessNameArgs {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThreadNameArgs {
    pub name: String,
}

// Parse Events
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PathArgs {
    pub path: String,
}

// Program Events
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigFilePathArgs {
    pub config_file_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FindSourceFileArgs {
    pub file_name: String,
    pub file_include_kind: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CountArgs {
    pub count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessTypeReferenceDirectiveArgs {
    pub directive: String,
    pub has_resolved: bool,
    pub ref_kind: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ref_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolveFromArgs {
    pub resolve_from: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContainingFileNameArgs {
    pub containing_file_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HasOldProgramArgs {
    pub has_old_program: bool,
}

// Check Events
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckExpressionArgs {
    pub kind: u64,
    pub pos: u64,
    pub end: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckNodeArgs {
    pub kind: u64,
    pub pos: u64,
    pub end: u64,
    pub path: String,
}

// CheckTypes Events
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckTypeParameterDeferredArgs {
    pub parent: i64,
    pub id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VarianceResults {
    pub variances: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetVariancesWorkerArgs {
    pub arity: u64,
    pub id: i64,
    pub results: VarianceResults,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StructuredTypeRelatedToArgs {
    pub source_id: i64,
    pub target_id: i64,
}

// CheckTypes Depth Limit Events
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckCrossProductUnionDepthLimitArgs {
    pub type_ids: Vec<i64>,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckTypeRelatedToDepthLimitArgs {
    pub source_id: i64,
    pub target_id: i64,
    pub depth: u64,
    pub target_depth: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetTypeAtFlowNodeDepthLimitArgs {
    pub flow_id: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstantiateTypeDepthLimitArgs {
    pub type_id: i64,
    pub instantiation_depth: i64,
    pub instantiation_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecursiveTypeRelatedToDepthLimitArgs {
    pub source_id: i64,
    pub source_id_stack: Vec<i64>,
    pub target_id: i64,
    pub target_id_stack: Vec<i64>,
    pub depth: u64,
    pub target_depth: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveSubtypesDepthLimitArgs {
    pub type_ids: Vec<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TraceUnionsOrIntersectionsTooLargeDepthLimitArgs {
    pub source_id: i64,
    pub source_size: u64,
    pub target_id: i64,
    pub target_size: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pos: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TypeRelatedToDiscriminatedTypeDepthLimitArgs {
    pub source_id: i64,
    pub target_id: i64,
    pub num_combinations: u64,
}

// Emit Events
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EmitArgs {}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct EmitBuildInfoArgs {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub build_info_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmitDeclarationFileOrBundleArgs {
    pub declaration_file_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmitJsFileOrBundleArgs {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub js_file_path: Option<String>,
}

// Session Events
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CancellationThrownArgs {
    pub kind: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandArgs {
    pub seq: u64,
    pub command: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandErrorArgs {
    pub seq: u64,
    pub command: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentRegistryBucketArgs {
    pub config_file_path: String,
    pub key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentRegistryBucketOverlapArgs {
    pub path: String,
    pub key1: String,
    pub key2: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetUnresolvedImportsArgs {
    pub count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileAndConfigArgs {
    pub file: String,
    pub config_file_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeqArgs {
    pub seq: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StepCanceledArgs {
    pub seq: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub early: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StepErrorArgs {
    pub seq: u64,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResponseArgs {
    pub seq: u64,
    pub command: String,
    pub success: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateGraphArgs {
    pub name: String,
    pub kind: u64,
}

// Discriminated union for all trace events
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "name")]
pub enum TraceEvent {
    TracingStartedInBrowser {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        #[serde(default)]
        args: TracingStartedInBrowserArgs,
    },
    #[serde(rename = "process_name")]
    ProcessName {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        args: ProcessNameArgs,
    },
    #[serde(rename = "thread_name")]
    ThreadName {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        args: ThreadNameArgs,
    },
    #[serde(rename = "createSourceFile")]
    CreateSourceFile {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        args: PathArgs,
    },
    #[serde(rename = "parseJsonSourceFileConfigFileContent")]
    ParseJsonSourceFileConfigFileContent {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        dur: f64,
        args: PathArgs,
    },
    #[serde(rename = "createProgram")]
    CreateProgram {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        args: ConfigFilePathArgs,
    },
    #[serde(rename = "findSourceFile")]
    FindSourceFile {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        dur: f64,
        args: FindSourceFileArgs,
    },
    #[serde(rename = "processRootFiles")]
    ProcessRootFiles {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        dur: f64,
        args: CountArgs,
    },
    #[serde(rename = "processTypeReferenceDirective")]
    ProcessTypeReferenceDirective {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        dur: f64,
        args: ProcessTypeReferenceDirectiveArgs,
    },
    #[serde(rename = "processTypeReferences")]
    ProcessTypeReferences {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        dur: f64,
        args: CountArgs,
    },
    #[serde(rename = "resolveLibrary")]
    ResolveLibrary {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        dur: f64,
        args: ResolveFromArgs,
    },
    #[serde(rename = "resolveModuleNamesWorker")]
    ResolveModuleNamesWorker {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        dur: f64,
        args: ContainingFileNameArgs,
    },
    #[serde(rename = "resolveTypeReferenceDirectiveNamesWorker")]
    ResolveTypeReferenceDirectiveNamesWorker {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        dur: f64,
        args: ContainingFileNameArgs,
    },
    #[serde(rename = "shouldProgramCreateNewSourceFiles")]
    ShouldProgramCreateNewSourceFiles {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        s: InstantScope,
        args: HasOldProgramArgs,
    },
    #[serde(rename = "tryReuseStructureFromOldProgram")]
    TryReuseStructureFromOldProgram {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        dur: f64,
        #[serde(default)]
        args: EmitArgs,
    },
    #[serde(rename = "bindSourceFile")]
    BindSourceFile {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        args: PathArgs,
    },
    #[serde(rename = "checkExpression")]
    CheckExpression {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        dur: f64,
        args: CheckExpressionArgs,
    },
    #[serde(rename = "checkSourceFile")]
    CheckSourceFile {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        args: PathArgs,
    },
    #[serde(rename = "checkVariableDeclaration")]
    CheckVariableDeclaration {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        dur: f64,
        args: CheckNodeArgs,
    },
    #[serde(rename = "checkDeferredNode")]
    CheckDeferredNode {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        dur: f64,
        args: CheckNodeArgs,
    },
    #[serde(rename = "checkSourceFileNodes")]
    CheckSourceFileNodes {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        dur: f64,
        args: PathArgs,
    },
    #[serde(rename = "checkTypeParameterDeferred")]
    CheckTypeParameterDeferred {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        dur: f64,
        args: CheckTypeParameterDeferredArgs,
    },
    #[serde(rename = "getVariancesWorker")]
    GetVariancesWorker {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        dur: f64,
        args: GetVariancesWorkerArgs,
    },
    #[serde(rename = "structuredTypeRelatedTo")]
    StructuredTypeRelatedTo {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        dur: f64,
        args: StructuredTypeRelatedToArgs,
    },
    #[serde(rename = "checkCrossProductUnion_DepthLimit")]
    CheckCrossProductUnionDepthLimit {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        s: InstantScope,
        args: CheckCrossProductUnionDepthLimitArgs,
    },
    #[serde(rename = "checkTypeRelatedTo_DepthLimit")]
    CheckTypeRelatedToDepthLimit {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        s: InstantScope,
        args: CheckTypeRelatedToDepthLimitArgs,
    },
    #[serde(rename = "getTypeAtFlowNode_DepthLimit")]
    GetTypeAtFlowNodeDepthLimit {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        s: InstantScope,
        args: GetTypeAtFlowNodeDepthLimitArgs,
    },
    #[serde(rename = "instantiateType_DepthLimit")]
    InstantiateTypeDepthLimit {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        s: InstantScope,
        args: InstantiateTypeDepthLimitArgs,
    },
    #[serde(rename = "recursiveTypeRelatedTo_DepthLimit")]
    RecursiveTypeRelatedToDepthLimit {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        s: InstantScope,
        args: RecursiveTypeRelatedToDepthLimitArgs,
    },
    #[serde(rename = "removeSubtypes_DepthLimit")]
    RemoveSubtypesDepthLimit {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        s: InstantScope,
        args: RemoveSubtypesDepthLimitArgs,
    },
    #[serde(rename = "traceUnionsOrIntersectionsTooLarge_DepthLimit")]
    TraceUnionsOrIntersectionsTooLargeDepthLimit {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        s: InstantScope,
        args: TraceUnionsOrIntersectionsTooLargeDepthLimitArgs,
    },
    #[serde(rename = "typeRelatedToDiscriminatedType_DepthLimit")]
    TypeRelatedToDiscriminatedTypeDepthLimit {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        s: InstantScope,
        args: TypeRelatedToDiscriminatedTypeDepthLimitArgs,
    },
    #[serde(rename = "emit")]
    Emit {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        #[serde(default)]
        args: EmitArgs,
    },
    #[serde(rename = "emitBuildInfo")]
    EmitBuildInfo {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        #[serde(skip_serializing_if = "Option::is_none")]
        dur: Option<f64>,
        #[serde(default)]
        args: EmitBuildInfoArgs,
    },
    #[serde(rename = "emitDeclarationFileOrBundle")]
    EmitDeclarationFileOrBundle {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        dur: f64,
        args: EmitDeclarationFileOrBundleArgs,
    },
    #[serde(rename = "emitJsFileOrBundle")]
    EmitJsFileOrBundle {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        dur: f64,
        args: EmitJsFileOrBundleArgs,
    },
    #[serde(rename = "transformNodes")]
    TransformNodes {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        dur: f64,
        args: PathArgs,
    },
    #[serde(rename = "cancellationThrown")]
    CancellationThrown {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        args: CancellationThrownArgs,
    },
    #[serde(rename = "commandCanceled")]
    CommandCanceled {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        args: CommandArgs,
    },
    #[serde(rename = "commandError")]
    CommandError {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        args: CommandErrorArgs,
    },
    #[serde(rename = "createConfiguredProject")]
    CreateConfiguredProject {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        args: ConfigFilePathArgs,
    },
    #[serde(rename = "createdDocumentRegistryBucket")]
    CreatedDocumentRegistryBucket {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        args: DocumentRegistryBucketArgs,
    },
    #[serde(rename = "documentRegistryBucketOverlap")]
    DocumentRegistryBucketOverlap {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        args: DocumentRegistryBucketOverlapArgs,
    },
    #[serde(rename = "executeCommand")]
    ExecuteCommand {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        args: CommandArgs,
    },
    #[serde(rename = "finishCachingPerDirectoryResolution")]
    FinishCachingPerDirectoryResolution {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        s: InstantScope,
        #[serde(default)]
        args: EmitArgs,
    },
    #[serde(rename = "getPackageJsonAutoImportProvider")]
    GetPackageJsonAutoImportProvider {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        dur: f64,
        #[serde(default)]
        args: EmitArgs,
    },
    #[serde(rename = "getUnresolvedImports")]
    GetUnresolvedImports {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        dur: f64,
        args: GetUnresolvedImportsArgs,
    },
    #[serde(rename = "loadConfiguredProject")]
    LoadConfiguredProject {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        args: ConfigFilePathArgs,
    },
    #[serde(rename = "regionSemanticCheck")]
    RegionSemanticCheck {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        args: FileAndConfigArgs,
    },
    #[serde(rename = "request")]
    Request {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        args: CommandArgs,
    },
    #[serde(rename = "response")]
    Response {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        args: ResponseArgs,
    },
    #[serde(rename = "semanticCheck")]
    SemanticCheck {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        args: FileAndConfigArgs,
    },
    #[serde(rename = "stepAction")]
    StepAction {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        s: InstantScope,
        args: SeqArgs,
    },
    #[serde(rename = "stepCanceled")]
    StepCanceled {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        args: StepCanceledArgs,
    },
    #[serde(rename = "stepError")]
    StepError {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        args: StepErrorArgs,
    },
    #[serde(rename = "suggestionCheck")]
    SuggestionCheck {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        args: FileAndConfigArgs,
    },
    #[serde(rename = "syntacticCheck")]
    SyntacticCheck {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        args: FileAndConfigArgs,
    },
    #[serde(rename = "updateGraph")]
    UpdateGraph {
        #[serde(flatten)]
        common: EventCommon,
        cat: String,
        ph: EventPhase,
        args: UpdateGraphArgs,
    },
}

impl TraceEvent {
    /// Get the common fields (pid, tid, ts) from any event variant
    pub fn common(&self) -> &EventCommon {
        match self {
            TraceEvent::TracingStartedInBrowser { common, .. } => common,
            TraceEvent::ProcessName { common, .. } => common,
            TraceEvent::ThreadName { common, .. } => common,
            TraceEvent::CreateSourceFile { common, .. } => common,
            TraceEvent::ParseJsonSourceFileConfigFileContent { common, .. } => common,
            TraceEvent::CreateProgram { common, .. } => common,
            TraceEvent::FindSourceFile { common, .. } => common,
            TraceEvent::ProcessRootFiles { common, .. } => common,
            TraceEvent::ProcessTypeReferenceDirective { common, .. } => common,
            TraceEvent::ProcessTypeReferences { common, .. } => common,
            TraceEvent::ResolveLibrary { common, .. } => common,
            TraceEvent::ResolveModuleNamesWorker { common, .. } => common,
            TraceEvent::ResolveTypeReferenceDirectiveNamesWorker { common, .. } => common,
            TraceEvent::ShouldProgramCreateNewSourceFiles { common, .. } => common,
            TraceEvent::TryReuseStructureFromOldProgram { common, .. } => common,
            TraceEvent::BindSourceFile { common, .. } => common,
            TraceEvent::CheckExpression { common, .. } => common,
            TraceEvent::CheckSourceFile { common, .. } => common,
            TraceEvent::CheckVariableDeclaration { common, .. } => common,
            TraceEvent::CheckDeferredNode { common, .. } => common,
            TraceEvent::CheckSourceFileNodes { common, .. } => common,
            TraceEvent::CheckTypeParameterDeferred { common, .. } => common,
            TraceEvent::GetVariancesWorker { common, .. } => common,
            TraceEvent::StructuredTypeRelatedTo { common, .. } => common,
            TraceEvent::CheckCrossProductUnionDepthLimit { common, .. } => common,
            TraceEvent::CheckTypeRelatedToDepthLimit { common, .. } => common,
            TraceEvent::GetTypeAtFlowNodeDepthLimit { common, .. } => common,
            TraceEvent::InstantiateTypeDepthLimit { common, .. } => common,
            TraceEvent::RecursiveTypeRelatedToDepthLimit { common, .. } => common,
            TraceEvent::RemoveSubtypesDepthLimit { common, .. } => common,
            TraceEvent::TraceUnionsOrIntersectionsTooLargeDepthLimit { common, .. } => common,
            TraceEvent::TypeRelatedToDiscriminatedTypeDepthLimit { common, .. } => common,
            TraceEvent::Emit { common, .. } => common,
            TraceEvent::EmitBuildInfo { common, .. } => common,
            TraceEvent::EmitDeclarationFileOrBundle { common, .. } => common,
            TraceEvent::EmitJsFileOrBundle { common, .. } => common,
            TraceEvent::TransformNodes { common, .. } => common,
            TraceEvent::CancellationThrown { common, .. } => common,
            TraceEvent::CommandCanceled { common, .. } => common,
            TraceEvent::CommandError { common, .. } => common,
            TraceEvent::CreateConfiguredProject { common, .. } => common,
            TraceEvent::CreatedDocumentRegistryBucket { common, .. } => common,
            TraceEvent::DocumentRegistryBucketOverlap { common, .. } => common,
            TraceEvent::ExecuteCommand { common, .. } => common,
            TraceEvent::FinishCachingPerDirectoryResolution { common, .. } => common,
            TraceEvent::GetPackageJsonAutoImportProvider { common, .. } => common,
            TraceEvent::GetUnresolvedImports { common, .. } => common,
            TraceEvent::LoadConfiguredProject { common, .. } => common,
            TraceEvent::RegionSemanticCheck { common, .. } => common,
            TraceEvent::Request { common, .. } => common,
            TraceEvent::Response { common, .. } => common,
            TraceEvent::SemanticCheck { common, .. } => common,
            TraceEvent::StepAction { common, .. } => common,
            TraceEvent::StepCanceled { common, .. } => common,
            TraceEvent::StepError { common, .. } => common,
            TraceEvent::SuggestionCheck { common, .. } => common,
            TraceEvent::SyntacticCheck { common, .. } => common,
            TraceEvent::UpdateGraph { common, .. } => common,
        }
    }

    /// Get the event name as a string
    pub fn name(&self) -> &'static str {
        match self {
            TraceEvent::TracingStartedInBrowser { .. } => "TracingStartedInBrowser",
            TraceEvent::ProcessName { .. } => "process_name",
            TraceEvent::ThreadName { .. } => "thread_name",
            TraceEvent::CreateSourceFile { .. } => "createSourceFile",
            TraceEvent::ParseJsonSourceFileConfigFileContent { .. } => {
                "parseJsonSourceFileConfigFileContent"
            }
            TraceEvent::CreateProgram { .. } => "createProgram",
            TraceEvent::FindSourceFile { .. } => "findSourceFile",
            TraceEvent::ProcessRootFiles { .. } => "processRootFiles",
            TraceEvent::ProcessTypeReferenceDirective { .. } => "processTypeReferenceDirective",
            TraceEvent::ProcessTypeReferences { .. } => "processTypeReferences",
            TraceEvent::ResolveLibrary { .. } => "resolveLibrary",
            TraceEvent::ResolveModuleNamesWorker { .. } => "resolveModuleNamesWorker",
            TraceEvent::ResolveTypeReferenceDirectiveNamesWorker { .. } => {
                "resolveTypeReferenceDirectiveNamesWorker"
            }
            TraceEvent::ShouldProgramCreateNewSourceFiles { .. } => {
                "shouldProgramCreateNewSourceFiles"
            }
            TraceEvent::TryReuseStructureFromOldProgram { .. } => "tryReuseStructureFromOldProgram",
            TraceEvent::BindSourceFile { .. } => "bindSourceFile",
            TraceEvent::CheckExpression { .. } => "checkExpression",
            TraceEvent::CheckSourceFile { .. } => "checkSourceFile",
            TraceEvent::CheckVariableDeclaration { .. } => "checkVariableDeclaration",
            TraceEvent::CheckDeferredNode { .. } => "checkDeferredNode",
            TraceEvent::CheckSourceFileNodes { .. } => "checkSourceFileNodes",
            TraceEvent::CheckTypeParameterDeferred { .. } => "checkTypeParameterDeferred",
            TraceEvent::GetVariancesWorker { .. } => "getVariancesWorker",
            TraceEvent::StructuredTypeRelatedTo { .. } => "structuredTypeRelatedTo",
            TraceEvent::CheckCrossProductUnionDepthLimit { .. } => {
                "checkCrossProductUnion_DepthLimit"
            }
            TraceEvent::CheckTypeRelatedToDepthLimit { .. } => "checkTypeRelatedTo_DepthLimit",
            TraceEvent::GetTypeAtFlowNodeDepthLimit { .. } => "getTypeAtFlowNode_DepthLimit",
            TraceEvent::InstantiateTypeDepthLimit { .. } => "instantiateType_DepthLimit",
            TraceEvent::RecursiveTypeRelatedToDepthLimit { .. } => {
                "recursiveTypeRelatedTo_DepthLimit"
            }
            TraceEvent::RemoveSubtypesDepthLimit { .. } => "removeSubtypes_DepthLimit",
            TraceEvent::TraceUnionsOrIntersectionsTooLargeDepthLimit { .. } => {
                "traceUnionsOrIntersectionsTooLarge_DepthLimit"
            }
            TraceEvent::TypeRelatedToDiscriminatedTypeDepthLimit { .. } => {
                "typeRelatedToDiscriminatedType_DepthLimit"
            }
            TraceEvent::Emit { .. } => "emit",
            TraceEvent::EmitBuildInfo { .. } => "emitBuildInfo",
            TraceEvent::EmitDeclarationFileOrBundle { .. } => "emitDeclarationFileOrBundle",
            TraceEvent::EmitJsFileOrBundle { .. } => "emitJsFileOrBundle",
            TraceEvent::TransformNodes { .. } => "transformNodes",
            TraceEvent::CancellationThrown { .. } => "cancellationThrown",
            TraceEvent::CommandCanceled { .. } => "commandCanceled",
            TraceEvent::CommandError { .. } => "commandError",
            TraceEvent::CreateConfiguredProject { .. } => "createConfiguredProject",
            TraceEvent::CreatedDocumentRegistryBucket { .. } => "createdDocumentRegistryBucket",
            TraceEvent::DocumentRegistryBucketOverlap { .. } => "documentRegistryBucketOverlap",
            TraceEvent::ExecuteCommand { .. } => "executeCommand",
            TraceEvent::FinishCachingPerDirectoryResolution { .. } => {
                "finishCachingPerDirectoryResolution"
            }
            TraceEvent::GetPackageJsonAutoImportProvider { .. } => {
                "getPackageJsonAutoImportProvider"
            }
            TraceEvent::GetUnresolvedImports { .. } => "getUnresolvedImports",
            TraceEvent::LoadConfiguredProject { .. } => "loadConfiguredProject",
            TraceEvent::RegionSemanticCheck { .. } => "regionSemanticCheck",
            TraceEvent::Request { .. } => "request",
            TraceEvent::Response { .. } => "response",
            TraceEvent::SemanticCheck { .. } => "semanticCheck",
            TraceEvent::StepAction { .. } => "stepAction",
            TraceEvent::StepCanceled { .. } => "stepCanceled",
            TraceEvent::StepError { .. } => "stepError",
            TraceEvent::SuggestionCheck { .. } => "suggestionCheck",
            TraceEvent::SyntacticCheck { .. } => "syntacticCheck",
            TraceEvent::UpdateGraph { .. } => "updateGraph",
        }
    }

    /// Get the category
    pub fn cat(&self) -> &str {
        match self {
            TraceEvent::TracingStartedInBrowser { cat, .. } => cat,
            TraceEvent::ProcessName { cat, .. } => cat,
            TraceEvent::ThreadName { cat, .. } => cat,
            TraceEvent::CreateSourceFile { cat, .. } => cat,
            TraceEvent::ParseJsonSourceFileConfigFileContent { cat, .. } => cat,
            TraceEvent::CreateProgram { cat, .. } => cat,
            TraceEvent::FindSourceFile { cat, .. } => cat,
            TraceEvent::ProcessRootFiles { cat, .. } => cat,
            TraceEvent::ProcessTypeReferenceDirective { cat, .. } => cat,
            TraceEvent::ProcessTypeReferences { cat, .. } => cat,
            TraceEvent::ResolveLibrary { cat, .. } => cat,
            TraceEvent::ResolveModuleNamesWorker { cat, .. } => cat,
            TraceEvent::ResolveTypeReferenceDirectiveNamesWorker { cat, .. } => cat,
            TraceEvent::ShouldProgramCreateNewSourceFiles { cat, .. } => cat,
            TraceEvent::TryReuseStructureFromOldProgram { cat, .. } => cat,
            TraceEvent::BindSourceFile { cat, .. } => cat,
            TraceEvent::CheckExpression { cat, .. } => cat,
            TraceEvent::CheckSourceFile { cat, .. } => cat,
            TraceEvent::CheckVariableDeclaration { cat, .. } => cat,
            TraceEvent::CheckDeferredNode { cat, .. } => cat,
            TraceEvent::CheckSourceFileNodes { cat, .. } => cat,
            TraceEvent::CheckTypeParameterDeferred { cat, .. } => cat,
            TraceEvent::GetVariancesWorker { cat, .. } => cat,
            TraceEvent::StructuredTypeRelatedTo { cat, .. } => cat,
            TraceEvent::CheckCrossProductUnionDepthLimit { cat, .. } => cat,
            TraceEvent::CheckTypeRelatedToDepthLimit { cat, .. } => cat,
            TraceEvent::GetTypeAtFlowNodeDepthLimit { cat, .. } => cat,
            TraceEvent::InstantiateTypeDepthLimit { cat, .. } => cat,
            TraceEvent::RecursiveTypeRelatedToDepthLimit { cat, .. } => cat,
            TraceEvent::RemoveSubtypesDepthLimit { cat, .. } => cat,
            TraceEvent::TraceUnionsOrIntersectionsTooLargeDepthLimit { cat, .. } => cat,
            TraceEvent::TypeRelatedToDiscriminatedTypeDepthLimit { cat, .. } => cat,
            TraceEvent::Emit { cat, .. } => cat,
            TraceEvent::EmitBuildInfo { cat, .. } => cat,
            TraceEvent::EmitDeclarationFileOrBundle { cat, .. } => cat,
            TraceEvent::EmitJsFileOrBundle { cat, .. } => cat,
            TraceEvent::TransformNodes { cat, .. } => cat,
            TraceEvent::CancellationThrown { cat, .. } => cat,
            TraceEvent::CommandCanceled { cat, .. } => cat,
            TraceEvent::CommandError { cat, .. } => cat,
            TraceEvent::CreateConfiguredProject { cat, .. } => cat,
            TraceEvent::CreatedDocumentRegistryBucket { cat, .. } => cat,
            TraceEvent::DocumentRegistryBucketOverlap { cat, .. } => cat,
            TraceEvent::ExecuteCommand { cat, .. } => cat,
            TraceEvent::FinishCachingPerDirectoryResolution { cat, .. } => cat,
            TraceEvent::GetPackageJsonAutoImportProvider { cat, .. } => cat,
            TraceEvent::GetUnresolvedImports { cat, .. } => cat,
            TraceEvent::LoadConfiguredProject { cat, .. } => cat,
            TraceEvent::RegionSemanticCheck { cat, .. } => cat,
            TraceEvent::Request { cat, .. } => cat,
            TraceEvent::Response { cat, .. } => cat,
            TraceEvent::SemanticCheck { cat, .. } => cat,
            TraceEvent::StepAction { cat, .. } => cat,
            TraceEvent::StepCanceled { cat, .. } => cat,
            TraceEvent::StepError { cat, .. } => cat,
            TraceEvent::SuggestionCheck { cat, .. } => cat,
            TraceEvent::SyntacticCheck { cat, .. } => cat,
            TraceEvent::UpdateGraph { cat, .. } => cat,
        }
    }

    /// Get the phase
    pub fn ph(&self) -> &EventPhase {
        match self {
            TraceEvent::TracingStartedInBrowser { ph, .. } => ph,
            TraceEvent::ProcessName { ph, .. } => ph,
            TraceEvent::ThreadName { ph, .. } => ph,
            TraceEvent::CreateSourceFile { ph, .. } => ph,
            TraceEvent::ParseJsonSourceFileConfigFileContent { ph, .. } => ph,
            TraceEvent::CreateProgram { ph, .. } => ph,
            TraceEvent::FindSourceFile { ph, .. } => ph,
            TraceEvent::ProcessRootFiles { ph, .. } => ph,
            TraceEvent::ProcessTypeReferenceDirective { ph, .. } => ph,
            TraceEvent::ProcessTypeReferences { ph, .. } => ph,
            TraceEvent::ResolveLibrary { ph, .. } => ph,
            TraceEvent::ResolveModuleNamesWorker { ph, .. } => ph,
            TraceEvent::ResolveTypeReferenceDirectiveNamesWorker { ph, .. } => ph,
            TraceEvent::ShouldProgramCreateNewSourceFiles { ph, .. } => ph,
            TraceEvent::TryReuseStructureFromOldProgram { ph, .. } => ph,
            TraceEvent::BindSourceFile { ph, .. } => ph,
            TraceEvent::CheckExpression { ph, .. } => ph,
            TraceEvent::CheckSourceFile { ph, .. } => ph,
            TraceEvent::CheckVariableDeclaration { ph, .. } => ph,
            TraceEvent::CheckDeferredNode { ph, .. } => ph,
            TraceEvent::CheckSourceFileNodes { ph, .. } => ph,
            TraceEvent::CheckTypeParameterDeferred { ph, .. } => ph,
            TraceEvent::GetVariancesWorker { ph, .. } => ph,
            TraceEvent::StructuredTypeRelatedTo { ph, .. } => ph,
            TraceEvent::CheckCrossProductUnionDepthLimit { ph, .. } => ph,
            TraceEvent::CheckTypeRelatedToDepthLimit { ph, .. } => ph,
            TraceEvent::GetTypeAtFlowNodeDepthLimit { ph, .. } => ph,
            TraceEvent::InstantiateTypeDepthLimit { ph, .. } => ph,
            TraceEvent::RecursiveTypeRelatedToDepthLimit { ph, .. } => ph,
            TraceEvent::RemoveSubtypesDepthLimit { ph, .. } => ph,
            TraceEvent::TraceUnionsOrIntersectionsTooLargeDepthLimit { ph, .. } => ph,
            TraceEvent::TypeRelatedToDiscriminatedTypeDepthLimit { ph, .. } => ph,
            TraceEvent::Emit { ph, .. } => ph,
            TraceEvent::EmitBuildInfo { ph, .. } => ph,
            TraceEvent::EmitDeclarationFileOrBundle { ph, .. } => ph,
            TraceEvent::EmitJsFileOrBundle { ph, .. } => ph,
            TraceEvent::TransformNodes { ph, .. } => ph,
            TraceEvent::CancellationThrown { ph, .. } => ph,
            TraceEvent::CommandCanceled { ph, .. } => ph,
            TraceEvent::CommandError { ph, .. } => ph,
            TraceEvent::CreateConfiguredProject { ph, .. } => ph,
            TraceEvent::CreatedDocumentRegistryBucket { ph, .. } => ph,
            TraceEvent::DocumentRegistryBucketOverlap { ph, .. } => ph,
            TraceEvent::ExecuteCommand { ph, .. } => ph,
            TraceEvent::FinishCachingPerDirectoryResolution { ph, .. } => ph,
            TraceEvent::GetPackageJsonAutoImportProvider { ph, .. } => ph,
            TraceEvent::GetUnresolvedImports { ph, .. } => ph,
            TraceEvent::LoadConfiguredProject { ph, .. } => ph,
            TraceEvent::RegionSemanticCheck { ph, .. } => ph,
            TraceEvent::Request { ph, .. } => ph,
            TraceEvent::Response { ph, .. } => ph,
            TraceEvent::SemanticCheck { ph, .. } => ph,
            TraceEvent::StepAction { ph, .. } => ph,
            TraceEvent::StepCanceled { ph, .. } => ph,
            TraceEvent::StepError { ph, .. } => ph,
            TraceEvent::SuggestionCheck { ph, .. } => ph,
            TraceEvent::SyntacticCheck { ph, .. } => ph,
            TraceEvent::UpdateGraph { ph, .. } => ph,
        }
    }

    /// Get duration if present
    pub fn dur(&self) -> Option<f64> {
        match self {
            TraceEvent::ParseJsonSourceFileConfigFileContent { dur, .. }
            | TraceEvent::FindSourceFile { dur, .. }
            | TraceEvent::ProcessRootFiles { dur, .. }
            | TraceEvent::ProcessTypeReferenceDirective { dur, .. }
            | TraceEvent::ProcessTypeReferences { dur, .. }
            | TraceEvent::ResolveLibrary { dur, .. }
            | TraceEvent::ResolveModuleNamesWorker { dur, .. }
            | TraceEvent::ResolveTypeReferenceDirectiveNamesWorker { dur, .. }
            | TraceEvent::TryReuseStructureFromOldProgram { dur, .. }
            | TraceEvent::CheckExpression { dur, .. }
            | TraceEvent::CheckVariableDeclaration { dur, .. }
            | TraceEvent::CheckDeferredNode { dur, .. }
            | TraceEvent::CheckSourceFileNodes { dur, .. }
            | TraceEvent::CheckTypeParameterDeferred { dur, .. }
            | TraceEvent::GetVariancesWorker { dur, .. }
            | TraceEvent::StructuredTypeRelatedTo { dur, .. }
            | TraceEvent::EmitDeclarationFileOrBundle { dur, .. }
            | TraceEvent::EmitJsFileOrBundle { dur, .. }
            | TraceEvent::TransformNodes { dur, .. }
            | TraceEvent::GetPackageJsonAutoImportProvider { dur, .. }
            | TraceEvent::GetUnresolvedImports { dur, .. } => Some(*dur),
            TraceEvent::EmitBuildInfo { dur, .. } => *dur,
            _ => None,
        }
    }
}

pub fn parse_trace_json(
    path_label: PathBuf,
    reader: impl std::io::Read,
) -> Result<Vec<TraceEvent>, String> {
    let raw: Value = serde_json::from_reader(reader)
        .map_err(|e| format!("Failed to parse {path_label:?}: {e}"))?;
    let arr = match raw {
        Value::Array(a) => a,
        _ => return Err("trace.json root is not an array".to_string()),
    };
    let mut events: Vec<TraceEvent> = Vec::with_capacity(arr.len());
    for (i, v) in arr.into_iter().enumerate() {
        let ev: TraceEvent =
            serde_json::from_value(v).map_err(|e| format!("trace.json event[{i}] error: {e}"))?;
        events.push(ev);
    }
    Ok(events)
}

pub async fn load_trace_json(path: PathBuf) -> Result<Vec<TraceEvent>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let file = std::fs::File::open(&path)
            .map_err(|e| format!("Failed to open trace.json at {path:?}: {e}"))?;
        parse_trace_json(path, BufReader::new(file))
    })
    .await
    .map_err(|e| e.to_string())?
}
