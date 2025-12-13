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
    case "type_typeArguments":
    case "type_unionTypes":
    case "type_intersectionTypes":
    case "type_aliasTypeArguments":
      return <TypeMetricsAward key={activeAward} awardId={activeAward} />;

    case "relation_union":
    case "relation_intersection":
    case "relation_typeArgument":
    case "relation_instantiated":
    case "relation_aliasTypeArgument":
    case "relation_conditionalCheck":
    case "relation_conditionalExtends":
    case "relation_conditionalFalse":
    case "relation_conditionalTrue":
    case "relation_indexedAccessObject":
    case "relation_indexedAccessIndex":
    case "relation_keyof":
    case "relation_reverseMappedSource":
    case "relation_reverseMappedMapped":
    case "relation_reverseMappedConstraint":
    case "relation_substitutionBase":
    case "relation_constraint":
    case "relation_evolvingArrayElement":
    case "relation_evolvingArrayFinal":
    case "relation_alias":
      return (
        <TypeRelationMetricsAward key={activeAward} awardId={activeAward} />
      );

    case "perf_hotSpots":
      return (
        <PerformanceMetricsAward key={activeAward} awardId={activeAward} />
      );

    case "limit_instantiateType":
    case "limit_recursiveTypeRelatedTo":
    case "limit_typeRelatedToDiscriminatedType":
    case "limit_checkCrossProductUnion":
    case "limit_getTypeAtFlowNode":
    case "limit_checkTypeRelatedTo":
    case "limit_removeSubtypes":
    case "limit_traceUnionsOrIntersectionsTooLarge":
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
