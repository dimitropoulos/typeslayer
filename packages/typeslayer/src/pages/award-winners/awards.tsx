import {
  Air,
  AltRoute,
  Calculate,
  Check,
  Close,
  CopyAll,
  Diversity1,
  Expand,
  Extension,
  FilterListAlt,
  FindReplace,
  Input,
  JoinFull,
  JoinInner,
  Key,
  Lightbulb,
  Polyline,
  QuestionMark,
  RotateRight,
  SafetyDivider,
  Search,
  SettingsBackupRestore,
  SportsKabaddi,
  SubdirectoryArrowRight,
  TrackChanges,
  Whatshot,
} from "@mui/icons-material";
import { Box, Typography } from "@mui/material";
import { typeRelationInfo } from "@typeslayer/validate";
import { InlineCode } from "../../components/inline-code";
import { useFriendlyPackageName } from "../../hooks/tauri-hooks";

export const AWARD_SELECTOR_COLUMN_WIDTH = 500;

export type AwardId = keyof typeof awards;

const doesNotError = (
  <Typography
    variant="body2"
    sx={{ fontStyle: "italic", color: "text.secondary" }}
  >
    This is not currently considered a hard error by the compiler and therefore
    does not report to the user (unless you're a TypeSlayer user 😉).
  </Typography>
);

export const awards = {
  //
  // TYPE METRICS
  //

  type_unionTypes: {
    title: "Largest Union",
    property: "unionTypes",
    description:
      "Type whose union has the greatest number of distinct members (breadth of possible shapes).",
    icon: JoinFull,
    unit: "union members",
    route: "largest-union",
  },
  type_intersectionTypes: {
    title: "Largest Intersection",
    property: "intersectionTypes",
    description:
      "Type whose intersection combines the greatest number of constituent types (breadth of constraints).",
    icon: JoinInner,
    unit: "intersections",
    route: "largest-intersection",
  },
  type_typeArguments: {
    title: "Most Type Arguments",
    property: "typeArguments",
    description:
      "Generic type with the largest number of supplied type arguments at its most complex instantiation.",
    icon: SportsKabaddi,
    unit: "type arguments",
    route: "most-type-arguments",
  },
  type_aliasTypeArguments: {
    title: "Generic Arguments",
    property: "aliasTypeArguments",
    description:
      "Type alias pulling in the greatest number of distinct generic arguments through its resolution layers.",
    icon: Input,
    unit: "generic arguments",
    route: "generic-arguments",
  },

  //
  // TYPE RELATION METRICS
  // (ordered by EDGE_RANKING)
  //

  relation_union: {
    ...typeRelationInfo.unionTypes,
    description: "The type most frequently included in unions.",
    icon: JoinFull,
    route: "union",
  },
  relation_intersection: {
    ...typeRelationInfo.intersectionTypes,
    description: "The type most frequently included in intersections.",
    icon: JoinInner,
    route: "intersection",
  },
  relation_typeArgument: {
    ...typeRelationInfo.typeArguments,
    description:
      "The type most frequently used as a type argument (indicating complex generic interactions).",
    icon: SportsKabaddi,
    route: "type-argument-relations",
  },
  relation_instantiated: {
    ...typeRelationInfo.instantiatedType,
    description: "Type that was instantiated the most, indicating high reuse.",
    icon: Polyline,
    route: "most-instantiated-type",
  },
  relation_aliasTypeArgument: {
    ...typeRelationInfo.aliasTypeArguments,
    description:
      'The types most often used as generic arguments.  The TypeScript compiler calls this "alias type-arguments."  There are technically other kinds of types that can show up here, but it\'s mostly generic type arguemnts.',
    icon: Input,
    route: "aliasTypeArgument",
  },
  relation_conditionalCheck: {
    ...typeRelationInfo.conditionalCheckType,
    description:
      "Type most often used as the checked type in conditional types (the `T` in `T extends U ? A : B`).",
    icon: QuestionMark,
    route: "conditionalCheck",
  },
  relation_conditionalExtends: {
    ...typeRelationInfo.conditionalExtendsType,
    description:
      "Type most frequently appearing on the `extends` side of conditional types (the `U` in `T extends U ? A : B`)), indicating common constraint relationships.",
    icon: Extension,
    route: "conditionalExtends",
  },
  relation_conditionalFalse: {
    ...typeRelationInfo.conditionalFalseType,
    description:
      "Type that most often appears as the `false` branch result of conditional types. Indicates fallback/resolution patterns.",
    icon: Close,
    route: "conditionalFalse",
  },
  relation_conditionalTrue: {
    ...typeRelationInfo.conditionalTrueType,
    description:
      "Type that most often appears as the `true` branch result of conditional types. Indicates favored resolution outcomes.",
    icon: Check,
    route: "conditionalTrue",
  },
  relation_indexedAccessObject: {
    ...typeRelationInfo.indexedAccessObjectType,
    description:
      "Type most frequently used as the object operand in indexed access (e.g. `T[K]`), indicating dynamic property shape usage.",
    icon: Search,
    route: "indexedAccessObject",
  },
  relation_indexedAccessIndex: {
    ...typeRelationInfo.indexedAccessIndexType,
    description:
      "Type most frequently used as the index operand in indexed access of a tuple (e.g. `SomeTuple[K]`).",
    icon: Search,
    route: "indexedAccessIndex",
  },
  relation_keyof: {
    ...typeRelationInfo.keyofType,
    description:
      "Type most frequently used within 'keyof' operations, often indicating dynamic property access patterns.",
    icon: Key,
    route: "keyof",
  },
  relation_reverseMappedSource: {
    ...typeRelationInfo.reverseMappedSourceType,
    description:
      "Type most commonly appearing as the source in reverse-mapped type transforms (utility mapped types in reverse).",
    icon: SettingsBackupRestore,
    route: "reverseMappedSource",
  },
  relation_reverseMappedMapped: {
    ...typeRelationInfo.reverseMappedMappedType,
    description:
      "Type most commonly produced by reverse-mapped transformations.",
    icon: SettingsBackupRestore,
    route: "reverseMappedMapped",
  },
  relation_reverseMappedConstraint: {
    ...typeRelationInfo.reverseMappedConstraintType,
    description:
      "Type that often serves as a constraint in reverse-mapped transformations, indicating mapped type bounds.",
    icon: SettingsBackupRestore,
    route: "reverseMappedConstraint",
  },
  relation_substitutionBase: {
    ...typeRelationInfo.substitutionBaseType,
    description:
      "Type used as a substitution base during type substitution operations, signaling types that commonly serve as generic inference placeholders.",
    icon: FindReplace,
    route: "substitutionBase",
  },
  relation_constraint: {
    ...typeRelationInfo.constraintType,
    description:
      "Type most often appearing as a generic constraint (e.g. in `extends` clauses) when resolving generics and conditionals.",
    icon: FilterListAlt,
    route: "constraint",
  },
  relation_evolvingArrayElement: {
    ...typeRelationInfo.evolvingArrayElementType,
    description:
      "Type most commonly used as the evolving array element during array widening/folding operations in inference.",
    icon: TrackChanges,
    route: "evolvingArrayElement",
  },
  relation_evolvingArrayFinal: {
    ...typeRelationInfo.evolvingArrayFinalType,
    description:
      "Type that frequently becomes the final element type after array evolution/widening, useful to spot common widened shapes.",
    icon: TrackChanges,
    route: "evolvingArrayFinal",
  },
  relation_alias: {
    ...typeRelationInfo.aliasType,
    description:
      "Type most frequently used as an alias target, shows which aliases are heavily reused across the codebase.",
    icon: AltRoute,
    route: "alias",
  },

  //
  // PERFORMANCE METRICS
  //

  perf_hotSpots: {
    title: "Hot Spots",
    description:
      "Files or paths where the TypeScript compiler spent the most cumulative time. Use these to target expensive type-checking work for refactors.",
    icon: Whatshot,
    route: "hot-spots",
  },

  //
  // TYPE-LEVEL LIMITS
  //

  limit_instantiateType: {
    title: "Type Instantiation",
    property: "limit_instantiateType",
    description: (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography>
          The <InlineCode>instantiateType_DepthLimit</InlineCode> is hit when
          more than 100 recursive type instantiations or 5,000,000
          instantiations are caused by the same statement or expression.
        </Typography>
        <Typography>
          There is a very high likelihood you're dealing with a combination of
          infinite generic types that perpetually generate new type identities,
          so TypeScript stops and throws this error.
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontStyle: "italic", color: "text.secondary" }}
        >
          This triggers the error{" "}
          <InlineCode primary>
            TS(2589) Type instantiation is excessively deep and possibly
            infinite.
          </InlineCode>
        </Typography>
      </Box>
    ),
    icon: Lightbulb,
    route: "type-instantiation-limit",
  },
  limit_recursiveTypeRelatedTo: {
    title: "Recursive Relations",
    property: "limit_recursiveTypeRelatedTo",
    description: (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography>
          The <InlineCode>recursiveTypeRelatedTo_DepthLimit</InlineCode> limit
          is hit when the sourceDepth or targetDepth of a type check exceeds 100
          during recursive type comparison, indicating a runaway recursion from
          deeply nested generics or type instantiations.
        </Typography>
        {doesNotError}
      </Box>
    ),
    icon: Diversity1,
    route: "recursive-relations-limit",
  },
  limit_typeRelatedToDiscriminatedType: {
    title: "Discrimination",
    property: "limit_typeRelatedToDiscriminatedType",
    description: (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography>
          The <InlineCode>typeRelatedToDiscriminatedType_DepthLimit</InlineCode>{" "}
          limit is hit when comparing a source object to a discriminated-union
          target type with more than 25 constituent types.
        </Typography>
        <Typography>
          When this occurs, the type checker will just return{" "}
          <InlineCode>false</InlineCode> for the type comparison to avoid
          excessive computation.
        </Typography>
        <Typography>
          This limit is hit when exploring discriminated union combinations
          causes too many branches to analyze. The limit prevents exhaustive
          exploration of a union where discriminant properties create too many
          unique type variations.
        </Typography>
        {doesNotError}
      </Box>
    ),
    icon: SafetyDivider,
    route: "discrimination-limit",
  },
  limit_checkCrossProductUnion: {
    title: "Cross-Product Union",
    property: "limit_checkCrossProductUnion",
    description: (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography>
          The <InlineCode>checkCrossProductUnion_DepthLimit</InlineCode> limit
          is hit when the cross-product of two types exceeds 100,000
          combinations while expanding intersections into a union.
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontStyle: "italic", color: "text.secondary" }}
        >
          This triggers the error{" "}
          <InlineCode primary>
            TS(2590) Expression produces a union type that is too complex to
            represent.
          </InlineCode>
        </Typography>
      </Box>
    ),
    icon: Calculate,
    route: "cross-product-union-limit",
  },
  limit_checkTypeRelatedTo: {
    title: "Type Relation Depth",
    property: "limit_checkTypeRelatedTo",
    description: (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography>
          The <InlineCode>checkTypeRelatedTo_DepthLimit</InlineCode> limit is
          hit when a type relationship check overflows: either the checker
          reaches its recursion stack limit while comparing deeply nested (or
          expanding) types or it exhausts the relation-complexity budget.
        </Typography>
        <Typography>
          In Node.js the maximum number of elements in a map is 2^24. TypeScript
          therefore limits the number of entries an invocation of{" "}
          <InlineCode>checkTypeRelatedTo</InlineCode> can add to a relation to
          1/8th of its remaining capacity. This limit being hit means the
          relation will be recorded as failing.
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontStyle: "italic", color: "text.secondary" }}
        >
          This triggers one of the following errors:{" "}
          <InlineCode primary>
            TS(2859) Excessive complexity comparing types
          </InlineCode>{" "}
          or{" "}
          <InlineCode primary>
            TS(2321) Excessive stack depth comparing types
          </InlineCode>
          .
        </Typography>
      </Box>
    ),
    icon: RotateRight,
    route: "type-related-to-limit",
  },
  limit_getTypeAtFlowNode: {
    title: "Flow Node Type",
    property: "limit_getTypeAtFlowNode",
    description: (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography>
          The <InlineCode>getTypeAtFlowNode_DepthLimit</InlineCode> limit is hit
          when resolving the control flow type for a reference causes more than
          2,000 recursions. To avoid overflowing the call stack, TypeScript
          reports an error and disables further control flow analysis in the
          containing function or module body.
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontStyle: "italic", color: "text.secondary" }}
        >
          This triggers the error{" "}
          <InlineCode primary>
            TS(2563) The containing function or module body is too large for
            control flow analysis.
          </InlineCode>
        </Typography>
      </Box>
    ),
    icon: Air,
    route: "flow-node-type-limit",
  },
  limit_removeSubtypes: {
    title: "Remove Subtypes",
    property: "limit_removeSubtypes",
    description: (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography>
          The <InlineCode>removeSubtypes_DepthLimit</InlineCode> limit is hit
          when the subtype removal algorithm encounters limits in complex
          union/intersection simplification cases.
        </Typography>

        <Typography
          variant="body2"
          sx={{ fontStyle: "italic", color: "text.secondary" }}
        >
          This triggers the error{" "}
          <InlineCode primary>
            TS(2590) Expression produces a union type that is too complex to
            represent.
          </InlineCode>
        </Typography>
      </Box>
    ),
    icon: SubdirectoryArrowRight,
    route: "remove-subtypes-limit",
  },
  limit_traceUnionsOrIntersectionsTooLarge: {
    title: "Union/Intersection Size",
    property: "limit_traceUnionsOrIntersectionsTooLarge",
    description: (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography>
          <InlineCode>traceUnionsOrIntersectionsTooLarge_DepthLimit</InlineCode>{" "}
          is hit when unions or intersections become too large to fully analyze
          without exceeding limits.
        </Typography>
        {doesNotError}
      </Box>
    ),
    icon: Expand,
    route: "union-intersection-size-limit",
  },

  //
  // BUNDLE IMPLICATIONS
  //

  bundle_duplicatePackages: {
    title: "Duplicate Packages",
    description:
      "Packages that appear multiple times in the bundle (different install paths / versions). Consolidate to reduce size & divergence.",
    icon: CopyAll,
    route: "duplicate-packages",
  },
} as const;

export const MaybePathCaption = ({
  maybePath,
}: {
  maybePath: string | null | undefined;
}) => {
  const friendlyPackageName = useFriendlyPackageName();

  if (!maybePath) {
    return null;
  }

  return (
    <Typography
      variant="caption"
      sx={{ color: "text.secondary", wordBreak: "break-all" }}
    >
      {friendlyPackageName(maybePath)}
    </Typography>
  );
};
