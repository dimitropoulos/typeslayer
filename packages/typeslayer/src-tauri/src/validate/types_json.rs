use super::utils::{Location, TypeId};
use serde::{Deserialize, Deserializer, Serialize};

pub const TYPES_JSON_FILENAME: &str = "types.json";

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum Flag {
    Any,
    Unknown,
    String,
    Number,
    Boolean,
    Enum,
    BigInt,
    StringLiteral,
    NumberLiteral,
    BooleanLiteral,
    EnumLiteral,
    BigIntLiteral,
    ESSymbol,
    UniqueESSymbol,
    Void,
    Undefined,
    Null,
    Never,
    TypeParameter,
    Object,
    Union,
    Intersection,
    Index,
    IndexedAccess,
    Conditional,
    Substitution,
    NonPrimitive,
    TemplateLiteral,
    StringMapping,
    Reserved1,
    Reserved2,
    AnyOrUnknown,
    Nullable,
    Literal,
    Unit,
    Freshable,
    StringOrNumberLiteral,
    StringOrNumberLiteralOrUnique,
    DefinitelyFalsy,
    PossiblyFalsy,
    Intrinsic,
    StringLike,
    NumberLike,
    BigIntLike,
    BooleanLike,
    EnumLike,
    ESSymbolLike,
    VoidLike,
    Primitive,
    DefinitelyNonNullable,
    DisjointDomains,
    UnionOrIntersection,
    StructuredType,
    TypeVariable,
    InstantiableNonPrimitive,
    InstantiablePrimitive,
    Instantiable,
    StructuredOrInstantiable,
    ObjectFlagsType,
    Simplifiable,
    Singleton,
    Narrowable,
    IncludesMask,
    IncludesMissingType,
    IncludesNonWideningType,
    IncludesWildcard,
    IncludesEmptyObject,
    IncludesInstantiable,
    IncludesConstrainedTypeVariable,
    IncludesError,
    NotPrimitiveUnion,
}

/// `intrinsicName` in the JSON
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum IntrinsicName {
    Any,
    Error,
    Unresolved,
    Unknown,
    True,
    False,
    Never,
    Void,
    Symbol,
    BigInt,
    Null,
    Undefined,
    Intrinsic,
    Object,
    Boolean,
    Number,
    String,
}

impl std::fmt::Display for IntrinsicName {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            IntrinsicName::Any => "any",
            IntrinsicName::Error => "error",
            IntrinsicName::Unresolved => "unresolved",
            IntrinsicName::Unknown => "unknown",
            IntrinsicName::True => "true",
            IntrinsicName::False => "false",
            IntrinsicName::Never => "never",
            IntrinsicName::Void => "void",
            IntrinsicName::Symbol => "symbol",
            IntrinsicName::BigInt => "bigint",
            IntrinsicName::Null => "null",
            IntrinsicName::Undefined => "undefined",
            IntrinsicName::Intrinsic => "intrinsic",
            IntrinsicName::Object => "object",
            IntrinsicName::Boolean => "boolean",
            IntrinsicName::Number => "number",
            IntrinsicName::String => "string",
        };
        write!(f, "{}", s)
    }
}

/// for some unknown reason, _only at the time of serialization_– the
/// JSON `conditionalTrueType` and `conditionalFalseType` fields are serialized as
/// `-1` instead of `null` if one is not found. This is a workaround for that.
fn handle_minus_one<'de, D>(deserializer: D) -> Result<Option<TypeId>, D::Error>
where
    D: Deserializer<'de>,
{
    let val = Option::<i64>::deserialize(deserializer)?;
    match val {
        Some(-1) => Ok(None),
        Some(v) => Ok(Some(v as TypeId)),
        None => Ok(None),
    }
}

/// Rust equivalent of your Zod `resolvedType` schema.
///
/// The `#[serde(rename_all = "camelCase")]` keeps the JSON field
/// names identical to your TS version (e.g. `recursionId`,
/// `isTuple`, `reverseMappedSourceType`, etc.).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ResolvedType {
    pub id: TypeId,
    pub flags: Vec<Flag>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub recursion_id: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub intrinsic_name: Option<IntrinsicName>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub first_declaration: Option<Location>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reference_location: Option<Location>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub destructuring_pattern: Option<Location>,

    // Arrays of type ids
    #[serde(skip_serializing_if = "Option::is_none")]
    pub type_arguments: Option<Vec<TypeId>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub union_types: Option<Vec<TypeId>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub intersection_types: Option<Vec<TypeId>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alias_type_arguments: Option<Vec<TypeId>>,

    // Single type ids
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instantiated_type: Option<TypeId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub substitution_base_type: Option<TypeId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub constraint_type: Option<TypeId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub indexed_access_object_type: Option<TypeId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub indexed_access_index_type: Option<TypeId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub conditional_check_type: Option<TypeId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub conditional_extends_type: Option<TypeId>,
    #[serde(
        skip_serializing_if = "Option::is_none",
        default,
        deserialize_with = "handle_minus_one"
    )]
    pub conditional_true_type: Option<TypeId>,
    #[serde(
        skip_serializing_if = "Option::is_none",
        default,
        deserialize_with = "handle_minus_one"
    )]
    pub conditional_false_type: Option<TypeId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keyof_type: Option<TypeId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alias_type: Option<TypeId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub evolving_array_element_type: Option<TypeId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub evolving_array_final_type: Option<TypeId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reverse_mapped_source_type: Option<TypeId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reverse_mapped_mapped_type: Option<TypeId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reverse_mapped_constraint_type: Option<TypeId>,

    /// Corresponds to `isTuple?: true` – in practice this will be
    /// either `None` or `Some(true)`, but we keep it as `Option<bool>`
    /// for faithful JSON mapping.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_tuple: Option<bool>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub symbol_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display: Option<String>,
}

/// `typesJsonSchema` – an array of `ResolvedType`
pub type TypesJsonSchema = Vec<ResolvedType>;

pub fn parse_types_json(path_label: &str, json_string: &str) -> Result<TypesJsonSchema, String> {
    let parsed: TypesJsonSchema = serde_json::from_str(json_string)
        .map_err(|e| format!("Failed to parse '{path_label}': {e}"))?;

    Ok(parsed)
}

pub async fn validate_types_json(path: String) -> Result<TypesJsonSchema, String> {
    let json_string = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read '{path}': {e}"))?;
    parse_types_json(&path, &json_string)
}
