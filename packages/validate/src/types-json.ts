import { z } from "zod/v4";
import { location, typeId } from "./utils";

export const TYPES_JSON_FILENAME = "types.json";

const flag = z.enum([
  "Any",
  "Unknown",
  "String",
  "Number",
  "Boolean",
  "Enum",
  "BigInt",
  "StringLiteral",
  "NumberLiteral",
  "BooleanLiteral",
  "EnumLiteral",
  "BigIntLiteral",
  "ESSymbol",
  "UniqueESSymbol",
  "Void",
  "Undefined",
  "Null",
  "Never",
  "TypeParameter",
  "Object",
  "Union",
  "Intersection",
  "Index",
  "IndexedAccess",
  "Conditional",
  "Substitution",
  "NonPrimitive",
  "TemplateLiteral",
  "StringMapping",
  "Reserved1",
  "Reserved2",
  "AnyOrUnknown",
  "Nullable",
  "Literal",
  "Unit",
  "Freshable",
  "StringOrNumberLiteral",
  "StringOrNumberLiteralOrUnique",
  "DefinitelyFalsy",
  "PossiblyFalsy",
  "Intrinsic",
  "StringLike",
  "NumberLike",
  "BigIntLike",
  "BooleanLike",
  "EnumLike",
  "ESSymbolLike",
  "VoidLike",
  "Primitive",
  "DefinitelyNonNullable",
  "DisjointDomains",
  "UnionOrIntersection",
  "StructuredType",
  "TypeVariable",
  "InstantiableNonPrimitive",
  "InstantiablePrimitive",
  "Instantiable",
  "StructuredOrInstantiable",
  "ObjectFlagsType",
  "Simplifiable",
  "Singleton",
  "Narrowable",
  "IncludesMask",
  "IncludesMissingType",
  "IncludesNonWideningType",
  "IncludesWildcard",
  "IncludesEmptyObject",
  "IncludesInstantiable",
  "IncludesConstrainedTypeVariable",
  "IncludesError",
  "NotPrimitiveUnion",
]);

const typeRelations = {
  typeArguments: z.array(typeId).optional(),
  unionTypes: z.array(typeId).optional(),
  intersectionTypes: z.array(typeId).optional(),
  aliasTypeArguments: z.array(typeId).optional(),
  instantiatedType: typeId.optional(),
  substitutionBaseType: typeId.optional(),
  constraintType: typeId.optional(),
  indexedAccessObjectType: typeId.optional(),
  indexedAccessIndexType: typeId.optional(),
  conditionalCheckType: typeId.optional(),
  conditionalExtendsType: typeId.optional(),
  conditionalTrueType: typeId.optional(),
  conditionalFalseType: typeId.optional(),
  keyofType: typeId.optional(),
  aliasType: typeId.optional(),
  evolvingArrayElementType: typeId.optional(),
  evolvingArrayFinalType: typeId.optional(),
  reverseMappedSourceType: typeId.optional(),
  reverseMappedMappedType: typeId.optional(),
  reverseMappedConstraintType: typeId.optional(),
};

export interface TypeRelationInfo {
  title: string;
  unit: string;
}

export const typeRelationInfo = {
  typeArguments: {
    title: "Type Argument",
    unit: "type arguments",
  },
  unionTypes: {
    title: "Union Member",
    unit: "unions",
  },
  intersectionTypes: {
    title: "Intersection Member",
    unit: "intersections",
  },
  aliasTypeArguments: {
    title: "Generic Arguments",
    unit: "alias type-arguments",
  },
  instantiatedType: {
    title: "Instantiated By",
    unit: "instantiations",
  },
  substitutionBaseType: {
    title: "Substitution Bases",
    unit: "substitution uses",
  },
  constraintType: {
    title: "Generic Constraints",
    unit: "constraint uses",
  },
  indexedAccessObjectType: {
    title: "Object Indexed Access By",
    unit: "indexed-accesses",
  },
  indexedAccessIndexType: {
    title: "Tuple Indexed Access By",
    unit: "indexed-accesses",
  },
  conditionalCheckType: {
    title: "Conditional Check Condition",
    unit: "conditional checks",
  },
  conditionalExtendsType: {
    title: "Conditional Extends",
    unit: "extends uses",
  },
  conditionalTrueType: {
    title: "Conditional True Branch",
    unit: "true-branch uses",
  },
  conditionalFalseType: {
    title: "Conditional False Branch",
    unit: "false-branch uses",
  },
  keyofType: {
    title: "Keyof Uses",
    unit: "keyof uses",
  },
  aliasType: {
    title: "Aliased As",
    unit: "alias uses",
  },
  evolvingArrayElementType: {
    title: "Evolving Array Element",
    unit: "array element uses",
  },
  evolvingArrayFinalType: {
    title: "Evolving Array Final",
    unit: "array final uses",
  },
  reverseMappedSourceType: {
    title: "Reverse-Map Source",
    unit: "reverse-mappings",
  },
  reverseMappedMappedType: {
    title: "Reverse-Map Mapped By",
    unit: "reverse-mapped sources",
  },
  reverseMappedConstraintType: {
    title: "Reverse-Map Constraints",
    unit: "reverse-mapping constraints",
  },
} satisfies Record<keyof typeof typeRelations, TypeRelationInfo>;

export const resolvedType = z
  .object({
    id: typeId,
    flags: z.array(flag),

    recursionId: z.number().optional(),
    intrinsicName: z
      .enum([
        "any",
        "error",
        "unresolved",
        "unknown",
        "true",
        "false",
        "never",
        "void",
        "symbol",
        "bigint",
        "null",
        "undefined",
        "intrinsic",
        "object",
        "boolean",
        "number",
        "string",
      ])
      .optional(),

    firstDeclaration: location.optional(),
    referenceLocation: location.optional(),
    destructuringPattern: location.optional(),

    ...typeRelations,

    isTuple: z.literal(true).optional(),

    symbolName: z.string().optional(),
    display: z.string().optional(),
  })
  .strict();

export type ResolvedType = z.infer<typeof resolvedType>;
export const typesJsonSchema = z.array(resolvedType);
export type TypesJsonSchema = z.infer<typeof typesJsonSchema>;
