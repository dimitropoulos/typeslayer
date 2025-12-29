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
import { depthLimitInfo, typeRelationInfo } from "@typeslayer/validate";
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

  source_unionTypes: {
    ...typeRelationInfo.unionTypes.source,
    icon: JoinFull,
    route: `source-${typeRelationInfo.unionTypes.route}`,
  },
  source_intersectionTypes: {
    ...typeRelationInfo.intersectionTypes.source,
    icon: JoinInner,
    route: `source-${typeRelationInfo.intersectionTypes.route}`,
  },
  source_typeArguments: {
    ...typeRelationInfo.typeArguments.source,
    icon: SportsKabaddi,
    route: `source-${typeRelationInfo.typeArguments.route}`,
  },
  source_aliasTypeArguments: {
    ...typeRelationInfo.aliasTypeArguments.source,
    icon: Input,
    route: `source-${typeRelationInfo.aliasTypeArguments.route}`,
  },

  //
  // TYPE RELATION METRICS (target)
  //

  target_unionTypes: {
    ...typeRelationInfo.unionTypes.target,
    route: `target-${typeRelationInfo.unionTypes.route}`,
    icon: JoinFull,
  },
  target_intersectionTypes: {
    ...typeRelationInfo.intersectionTypes.target,
    route: `target-${typeRelationInfo.intersectionTypes.route}`,
    icon: JoinInner,
  },
  target_typeArguments: {
    ...typeRelationInfo.typeArguments.target,
    route: `target-${typeRelationInfo.typeArguments.route}`,
    icon: SportsKabaddi,
  },
  target_instantiatedType: {
    ...typeRelationInfo.instantiatedType.target,
    route: `target-${typeRelationInfo.instantiatedType.route}`,
    icon: Polyline,
  },
  target_aliasTypeArguments: {
    ...typeRelationInfo.aliasTypeArguments.target,
    route: `target-${typeRelationInfo.aliasTypeArguments.route}`,
    icon: Input,
  },
  target_conditionalCheckType: {
    ...typeRelationInfo.conditionalCheckType.target,
    route: `target-${typeRelationInfo.conditionalCheckType.route}`,
    icon: QuestionMark,
  },
  target_conditionalExtendsType: {
    ...typeRelationInfo.conditionalExtendsType.target,
    route: `target-${typeRelationInfo.conditionalExtendsType.route}`,
    icon: Extension,
  },
  target_conditionalFalseType: {
    ...typeRelationInfo.conditionalFalseType.target,
    route: `target-${typeRelationInfo.conditionalFalseType.route}`,
    icon: Close,
  },
  target_conditionalTrueType: {
    ...typeRelationInfo.conditionalTrueType.target,
    route: `target-${typeRelationInfo.conditionalTrueType.route}`,
    icon: Check,
  },
  target_indexedAccessObjectType: {
    ...typeRelationInfo.indexedAccessObjectType.target,
    route: `target-${typeRelationInfo.indexedAccessObjectType.route}`,
    icon: Search,
  },
  target_indexedAccessIndexType: {
    ...typeRelationInfo.indexedAccessIndexType.target,
    route: `target-${typeRelationInfo.indexedAccessIndexType.route}`,
    icon: Search,
  },
  target_keyofType: {
    ...typeRelationInfo.keyofType.target,
    route: `target-${typeRelationInfo.keyofType.route}`,
    icon: Key,
  },
  target_reverseMappedSourceType: {
    ...typeRelationInfo.reverseMappedSourceType.target,
    route: `target-${typeRelationInfo.reverseMappedSourceType.route}`,
    icon: SettingsBackupRestore,
  },
  target_reverseMappedMappedType: {
    ...typeRelationInfo.reverseMappedMappedType.target,
    route: `target-${typeRelationInfo.reverseMappedMappedType.route}`,
    icon: SettingsBackupRestore,
  },
  target_reverseMappedConstraintType: {
    ...typeRelationInfo.reverseMappedConstraintType.target,
    route: `target-${typeRelationInfo.reverseMappedConstraintType.route}`,
    icon: SettingsBackupRestore,
  },
  target_substitutionBaseType: {
    ...typeRelationInfo.substitutionBaseType.target,
    route: `target-${typeRelationInfo.substitutionBaseType.route}`,
    icon: FindReplace,
  },
  target_constraintType: {
    ...typeRelationInfo.constraintType.target,
    route: `target-${typeRelationInfo.constraintType.route}`,
    icon: FilterListAlt,
  },
  target_evolvingArrayElementType: {
    ...typeRelationInfo.evolvingArrayElementType.target,
    route: `target-${typeRelationInfo.evolvingArrayElementType.route}`,
    icon: TrackChanges,
  },
  target_evolvingArrayFinalType: {
    ...typeRelationInfo.evolvingArrayFinalType.target,
    route: `target-${typeRelationInfo.evolvingArrayFinalType.route}`,
    icon: TrackChanges,
  },
  target_aliasType: {
    ...typeRelationInfo.aliasType.target,
    route: `target-${typeRelationInfo.aliasType.route}`,
    icon: AltRoute,
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

  instantiateType_DepthLimit: {
    ...depthLimitInfo.instantiateType_DepthLimit,
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
  },
  recursiveTypeRelatedTo_DepthLimit: {
    ...depthLimitInfo.recursiveTypeRelatedTo_DepthLimit,
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
  },
  typeRelatedToDiscriminatedType_DepthLimit: {
    ...depthLimitInfo.typeRelatedToDiscriminatedType_DepthLimit,
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
  },
  checkCrossProductUnion_DepthLimit: {
    ...depthLimitInfo.checkCrossProductUnion_DepthLimit,
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
  },
  checkTypeRelatedTo_DepthLimit: {
    ...depthLimitInfo.checkTypeRelatedTo_DepthLimit,
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
  },
  getTypeAtFlowNode_DepthLimit: {
    ...depthLimitInfo.getTypeAtFlowNode_DepthLimit,
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
  },
  removeSubtypes_DepthLimit: {
    ...depthLimitInfo.removeSubtypes_DepthLimit,
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
  },
  traceUnionsOrIntersectionsTooLarge_DepthLimit: {
    ...depthLimitInfo.traceUnionsOrIntersectionsTooLarge_DepthLimit,
    property: "traceUnionsOrIntersectionsTooLarge_DepthLimit",
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
