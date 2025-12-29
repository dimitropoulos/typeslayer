import { Box, Divider, List, Stack } from "@mui/material";
import {
  BundleImplicationsAward,
  BundleImplicationsNavItems,
} from "./bundle-implications";
import {
  PerformanceMetricsAward,
  PerformanceMetricsNavItems,
} from "./performance-metrics";
import {
  TypeLevelLimitAward,
  TypeLevelLimitsNavItems,
} from "./type-level-limits";
import { TypeMetricsAward, TypeMetricsNavItems } from "./type-metrics";
import {
  TypeRelationMetricsAward,
  TypeRelationMetricsNavItems,
} from "./type-relation-metrics";
import { useAwardId } from "./use-award-id";

export const RenderPlayground = () => {
  const { activeAward } = useAwardId();

  switch (activeAward) {
    case "source_typeArguments":
    case "source_unionTypes":
    case "source_intersectionTypes":
    case "source_aliasTypeArguments":
      return <TypeMetricsAward key={activeAward} awardId={activeAward} />;

    case "target_unionTypes":
    case "target_intersectionTypes":
    case "target_typeArguments":
    case "target_instantiatedType":
    case "target_aliasTypeArguments":
    case "target_conditionalCheckType":
    case "target_conditionalExtendsType":
    case "target_conditionalFalseType":
    case "target_conditionalTrueType":
    case "target_indexedAccessObjectType":
    case "target_indexedAccessIndexType":
    case "target_keyofType":
    case "target_reverseMappedSourceType":
    case "target_reverseMappedMappedType":
    case "target_reverseMappedConstraintType":
    case "target_substitutionBaseType":
    case "target_constraintType":
    case "target_evolvingArrayElementType":
    case "target_evolvingArrayFinalType":
    case "target_aliasType":
      return (
        <TypeRelationMetricsAward key={activeAward} awardId={activeAward} />
      );

    case "perf_hotSpots":
      return (
        <PerformanceMetricsAward key={activeAward} awardId={activeAward} />
      );

    case "instantiateType_DepthLimit":
    case "recursiveTypeRelatedTo_DepthLimit":
    case "typeRelatedToDiscriminatedType_DepthLimit":
    case "checkCrossProductUnion_DepthLimit":
    case "getTypeAtFlowNode_DepthLimit":
    case "checkTypeRelatedTo_DepthLimit":
    case "removeSubtypes_DepthLimit":
    case "traceUnionsOrIntersectionsTooLarge_DepthLimit":
      return <TypeLevelLimitAward key={activeAward} awardId={activeAward} />;

    case "bundle_duplicatePackages":
      return (
        <BundleImplicationsAward key={activeAward} awardId={activeAward} />
      );

    default:
      activeAward satisfies never;
      throw new Error(`Unknown award: ${activeAward}`);
  }
};

export const AwardWinners = () => {
  return (
    <Stack
      sx={{
        minWidth: 500,
        minHeight: 500,
        alignItems: "flex-start",
        flexGrow: 1,
        flexDirection: "row",
        height: "100%",
        display: "flex",
      }}
    >
      <List
        sx={{
          height: "100%",
          flexShrink: 0,
          maxWidth: 390,
          overflowY: "auto",
          borderRight: 1,
          borderColor: "divider",
          pb: 4,
          "& .MuiListItemButton-root": {
            whiteSpace: "nowrap",
          },
        }}
      >
        <TypeMetricsNavItems />
        <Divider sx={{ mt: 1 }} />
        <TypeRelationMetricsNavItems />
        <Divider sx={{ mt: 1 }} />
        <PerformanceMetricsNavItems />
        <Divider sx={{ mt: 1 }} />
        <TypeLevelLimitsNavItems />
        <Divider sx={{ mt: 1 }} />
        <BundleImplicationsNavItems />
      </List>

      <Box
        sx={{
          flexGrow: 1,
          maxWidth: "100%",
          height: "100%",
          overflow: "auto",
        }}
      >
        <RenderPlayground />
      </Box>
    </Stack>
  );
};
