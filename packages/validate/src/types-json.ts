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
  source: {
    title: string;
    description: string;
    unit: string;
  };
  target: {
    title: string;
    description: string;
    unit: string;
  };
  route: string;
}

export const typeRelationOrder = [
  "unionTypes",
  "intersectionTypes",
  "typeArguments",
  "instantiatedType",
  "aliasTypeArguments",
  "conditionalCheckType",
  "conditionalExtendsType",
  "conditionalFalseType",
  "conditionalTrueType",
  "indexedAccessObjectType",
  "indexedAccessIndexType",
  "keyofType",
  "reverseMappedSourceType",
  "reverseMappedMappedType",
  "reverseMappedConstraintType",
  "substitutionBaseType",
  "constraintType",
  "evolvingArrayElementType",
  "evolvingArrayFinalType",
  "aliasType",
] as const;

export const typeRelationInfo = {
  unionTypes: {
    source: {
      title: "Union",
      unit: "union members",
      description:
        "Type whose union has the greatest number of distinct members (breadth of possible shapes).",
    },
    target: {
      title: "Union Member",
      unit: "unions",
      description: "The type most frequently included in unions.",
    },
    route: "union-types",
  },
  intersectionTypes: {
    source: {
      title: "Intersection",
      unit: "intersections",
      description:
        "Type whose intersection combines the greatest number of constituent types (breadth of constraints).",
    },
    target: {
      title: "Intersection Member",
      unit: "intersections",
      description: "The type most frequently included in intersections.",
    },
    route: "intersection-types",
  },
  typeArguments: {
    source: {
      title: "Type Arguments",
      unit: "type arguments",
      description:
        "Generic type with the largest number of supplied type arguments at its most complex instantiation.",
    },
    target: {
      title: "Type Argument",
      unit: "type arguments",
      description:
        "The type most frequently used as a type argument (indicating complex generic interactions).",
    },
    route: "type-arguments",
  },
  instantiatedType: {
    source: {
      title: "Instantiated",
      unit: "",
      description: "",
    },
    target: {
      title: "Instantiated By",
      unit: "instantiations",
      description:
        "Type that was instantiated the most, indicating high reuse.",
    },
    route: "instantiated-type",
  },
  aliasTypeArguments: {
    source: {
      title: "Generic Argument",
      unit: "generic arguments",
      description:
        "Type alias pulling in the greatest number of distinct generic arguments through its resolution layers.",
    },
    target: {
      title: "Generic Arguments",
      unit: "alias type-arguments",
      description:
        'The types most often used as generic arguments.  The TypeScript compiler calls this "alias type-arguments."  There are technically other kinds of types that can show up here, but it\'s mostly generic type arguments.',
    },
    route: "alias-type-arguments",
  },
  conditionalCheckType: {
    source: {
      title: "Conditional Check",
      unit: "",
      description: "",
    },
    target: {
      title: "Conditional Check Condition",
      unit: "conditional checks",
      description:
        "Type most often used as the checked type in conditional types (the `T` in `T extends U ? A : B`).",
    },
    route: "conditional-check-type",
  },
  conditionalExtendsType: {
    source: {
      title: "Conditional Extends",
      unit: "",
      description: "",
    },
    target: {
      title: "Conditional Extends",
      unit: "extends uses",
      description:
        "Type most frequently appearing on the `extends` side of conditional types (the `U` in `T extends U ? A : B`)), indicating common constraint relationships.",
    },
    route: "conditional-extends-type",
  },
  conditionalFalseType: {
    source: {
      title: "Conditional False",
      unit: "",
      description: "",
    },
    target: {
      title: "Conditional False Branch",
      unit: "false-branch uses",
      description:
        "Type that most often appears as the `false` branch result of conditional types. Indicates fallback/resolution patterns.",
    },
    route: "conditional-false-type",
  },
  conditionalTrueType: {
    source: {
      title: "Conditional True",
      unit: "",
      description: "",
    },
    target: {
      title: "Conditional True Branch",
      unit: "true-branch uses",
      description:
        "Type that most often appears as the `true` branch result of conditional types. Indicates favored resolution outcomes.",
    },
    route: "conditional-true-type",
  },
  indexedAccessObjectType: {
    source: {
      title: "Indexed Access Object",
      unit: "",
      description: "",
    },
    target: {
      title: "Object Indexed Access By",
      unit: "indexed-accesses",
      description:
        "Type most frequently used as the object operand in indexed access (e.g. `T[K]`), indicating dynamic property shape usage.",
    },
    route: "indexed-access-object-type",
  },
  indexedAccessIndexType: {
    source: {
      title: "Indexed Access Index",
      unit: "",
      description: "",
    },
    target: {
      title: "Tuple Indexed Access By",
      unit: "indexed-accesses",
      description:
        "Type most frequently used as the index operand in indexed access of a tuple (e.g. `SomeTuple[K]`).",
    },
    route: "indexed-access-index-type",
  },
  keyofType: {
    source: {
      title: "Keyof",
      unit: "",
      description: "",
    },
    target: {
      title: "Keyof Uses",
      unit: "keyof uses",
      description:
        "Type most frequently used within 'keyof' operations, often indicating dynamic property access patterns.",
    },
    route: "keyof-type",
  },
  reverseMappedSourceType: {
    source: {
      title: "Reverse Mapped Source",
      unit: "",
      description: "",
    },
    target: {
      title: "Reverse-Map Source",
      unit: "reverse-mappings",
      description:
        "Type most commonly appearing as the source in reverse-mapped type transforms (utility mapped types in reverse).",
    },
    route: "reverse-mapped-source-type",
  },
  reverseMappedMappedType: {
    source: {
      title: "Reverse Mapped Mapped",
      unit: "",
      description: "",
    },
    target: {
      title: "Reverse-Map Mapped By",
      unit: "reverse-mapped sources",
      description:
        "Type most commonly produced by reverse-mapped transformations.",
    },
    route: "reverse-mapped-mapped-type",
  },
  reverseMappedConstraintType: {
    source: {
      title: "Reverse Mapped Constraint",
      unit: "",
      description: "",
    },
    target: {
      title: "Reverse-Map Constraints",
      unit: "reverse-mapping constraints",
      description:
        "Type that often serves as a constraint in reverse-mapped transformations, indicating mapped type bounds.",
    },
    route: "reverse-mapped-constraint-type",
  },
  substitutionBaseType: {
    source: {
      title: "Substitution Base",
      unit: "",
      description: "",
    },
    target: {
      title: "Substitution Bases",
      unit: "substitution uses",
      description:
        "Type used as a substitution base during type substitution operations, signaling types that commonly serve as generic inference placeholders.",
    },
    route: "substitution-base-type",
  },
  constraintType: {
    source: {
      title: "Constraint",
      unit: "",
      description: "",
    },
    target: {
      title: "Generic Constraints",
      unit: "constraint uses",
      description:
        "Type most often appearing as a generic constraint (e.g. in `extends` clauses) when resolving generics and conditionals.",
    },
    route: "constraint-type",
  },
  evolvingArrayElementType: {
    source: {
      title: "Evolving Array Element",
      unit: "",
      description: "",
    },
    target: {
      title: "Evolving Array Element",
      unit: "array element uses",
      description:
        "Type most commonly used as the evolving array element during array widening/folding operations in inference.",
    },
    route: "evolving-array-element-type",
  },
  evolvingArrayFinalType: {
    source: {
      title: "Evolving Array Final",
      unit: "",
      description: "",
    },
    target: {
      title: "Evolving Array Final",
      unit: "array final uses",
      description:
        "Type that frequently becomes the final element type after array evolution/widening, useful to spot common widened shapes.",
    },
    route: "evolving-array-final-type",
  },
  aliasType: {
    source: {
      title: "Alias",
      unit: "",
      description: "",
    },
    target: {
      title: "Aliased As",
      unit: "alias uses",
      description:
        "Type most frequently used as an alias target, shows which aliases are heavily reused across the codebase.",
    },
    route: "alias-type",
  },
} as const satisfies Record<keyof typeof typeRelations, TypeRelationInfo>;

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
