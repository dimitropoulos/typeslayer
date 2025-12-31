import {
  Alert,
  AlertTitle,
  Box,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Stack,
  Typography,
} from "@mui/material";
import { InlineCode } from "@typeslayer/common";
import type { TypeId } from "@typeslayer/validate";
import { useMemo, useState } from "react";
import { CenterLoader } from "../../components/center-loader";
import { DisplayRecursiveType } from "../../components/display-recursive-type";
import { NoData } from "../../components/no-data";
import { ShowMoreChildren } from "../../components/show-more-children";
import {
  getHumanReadableName,
  TypeSummary,
} from "../../components/type-summary";
import {
  useGetResolvedTypeById,
  useGetResolvedTypesByIds,
  useTypeGraphLimitedNodeAndLinkStats,
} from "../../hooks/tauri-hooks";
import { targetToSourcesIndex } from "../../types/type-graph";
import { AwardNavItem } from "./award-nav-item";
import {
  AWARD_SELECTOR_COLUMN_WIDTH,
  type AwardId,
  awards,
  MaybePathCaption,
} from "./awards";
import { InlineBarGraph } from "./inline-bar-graph";
import { TitleSubtitle } from "./title-subtitle";

export function RelationAward({
  awardId,
}: {
  awardId: TypeRelationMetricsAwardId;
}) {
  const { title, description, icon: Icon, unit } = awards[awardId];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { data: typeGraph, isLoading: isLoadingTypeGraph } =
    useTypeGraphLimitedNodeAndLinkStats();

  const handleListItemClick = (
    _event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    index: number,
  ) => {
    setSelectedIndex(index);
  };
  const hasData = typeGraph !== undefined;

  const edgeStatProperty = extractTargetAwardId(awardId);
  const linkStats = typeGraph?.linkStats[edgeStatProperty];

  const targets = useMemo(() => {
    return (
      linkStats?.byTarget.targetToSources.map(
        link => link[targetToSourcesIndex.targetId],
      ) ?? []
    );
  }, [linkStats]);

  const selectedItem = linkStats?.byTarget.targetToSources[selectedIndex];
  const {
    data: partialIndexedTypeRegistry,
    isLoading: isLoadingPartialIndexedTypeRegistry,
  } = useGetResolvedTypesByIds(targets);

  const isLoading = isLoadingTypeGraph || isLoadingPartialIndexedTypeRegistry;

  const hasItems = linkStats && linkStats.byTarget.targetToSources.length > 0;

  const noneFound = (
    <Box
      sx={{
        m: 1,
      }}
    >
      <Alert severity="info">
        <AlertTitle>
          No <InlineCode>"{title}"</InlineCode> Relations Found
        </AlertTitle>
        <Stack gap={1}>
          <Typography>
            Your codebase has no types with this relation.
          </Typography>
          <Typography>That's not necessarily a good or bad thing.</Typography>
          <Typography>Just.. a thing.</Typography>
        </Stack>
      </Alert>
    </Box>
  );

  const items = (
    <List>
      {linkStats?.byTarget.targetToSources.map(
        ([targetId, sourceIds], index) => {
          const maybeResolvedType = partialIndexedTypeRegistry?.[targetId];
          return (
            <ListItemButton
              selected={index === selectedIndex}
              onClick={event => handleListItemClick(event, index)}
              key={targetId}
            >
              <ListItemText>
                <Stack sx={{ flexGrow: 1 }} gap={0}>
                  <TypeSummary
                    typeId={targetId}
                    flags={[]}
                    showFlags={false}
                    loading={isLoadingPartialIndexedTypeRegistry}
                    name={getHumanReadableName(maybeResolvedType)}
                    suppressActions
                  />
                  <Stack gap={0.5}>
                    <MaybePathCaption
                      maybePath={typeGraph?.pathMap[targetId]}
                    />
                    <InlineBarGraph
                      label={`${sourceIds.length.toLocaleString()} ${unit}`}
                      width={`${(sourceIds.length / linkStats.byTarget.max) * 100}%`}
                    />
                  </Stack>
                </Stack>
              </ListItemText>
            </ListItemButton>
          );
        },
      )}
    </List>
  );

  return (
    <Stack
      sx={{ flexDirection: "row", alignItems: "flex-start", height: "100%" }}
    >
      <Stack
        sx={{
          width: AWARD_SELECTOR_COLUMN_WIDTH,
          background: hasItems ? "#000000" : "transparent",
          flexShrink: 0,
          p: 1,
          pt: 2,
          overflowY: "auto",
          maxHeight: "100%",
          minHeight: "100%",
          borderRight: 1,
          borderColor: hasItems ? "divider" : "transparent",
        }}
      >
        <TitleSubtitle
          title={title}
          subtitle={description}
          icon={<Icon fontSize="large" />}
        />
        {isLoading ? (
          <CenterLoader />
        ) : hasData ? (
          hasItems ? (
            items
          ) : (
            noneFound
          )
        ) : (
          <NoData />
        )}
      </Stack>

      <Box
        sx={{
          p: 3,
          overflowY: "auto",
          maxHeight: "100%",
          width: "100%",
          height: "100%",
        }}
      >
        {hasItems && selectedItem ? (
          <Stack gap={3}>
            <DisplayRecursiveType
              id={selectedItem[targetToSourcesIndex.targetId]}
            />

            {selectedItem && hasItems && (
              <>
                <Divider />
                <Stack gap={1}>
                  <Typography variant="h6">
                    {selectedItem[
                      targetToSourcesIndex.sourceIds
                    ].length.toLocaleString()}{" "}
                    {unit}
                  </Typography>
                  <List dense sx={{ backgroundColor: "transparent" }}>
                    <ShowMoreChildren incrementsOf={50}>
                      {selectedItem[targetToSourcesIndex.sourceIds].map(
                        (sourceId, index) => (
                          <TypeMetricsListItem
                            key={`${index}-${sourceId}`}
                            typeId={sourceId}
                          />
                        ),
                      )}
                    </ShowMoreChildren>
                  </List>
                </Stack>
              </>
            )}
          </Stack>
        ) : null}
      </Box>
    </Stack>
  );
}

const TypeMetricsListItem = ({ typeId }: { typeId: TypeId }) => {
  const { data: resolvedType, isLoading } = useGetResolvedTypeById(typeId);

  const sx = {
    display: "flex",
    alignItems: "center",
    gap: 1,
    flexWrap: "nowrap",
    pl: 0,
  };

  if (isLoading) {
    return (
      <ListItem sx={sx}>
        <CenterLoader />
      </ListItem>
    );
  }

  if (!resolvedType) {
    return (
      <ListItem sx={sx}>
        <Alert severity="error">Type not found</Alert>
      </ListItem>
    );
  }

  return (
    <ListItem sx={sx}>
      <TypeSummary
        typeId={resolvedType.id}
        flags={resolvedType.flags}
        name={getHumanReadableName(resolvedType)}
        showFlags
      />
    </ListItem>
  );
};

const typeRelationMetrics = [
  "target_unionTypes",
  "target_intersectionTypes",
  "target_typeArguments",
  "target_instantiatedType",
  "target_aliasTypeArguments",
  "target_conditionalCheckType",
  "target_conditionalExtendsType",
  "target_conditionalFalseType",
  "target_conditionalTrueType",
  "target_indexedAccessObjectType",
  "target_indexedAccessIndexType",
  "target_keyofType",
  "target_reverseMappedSourceType",
  "target_reverseMappedMappedType",
  "target_reverseMappedConstraintType",
  "target_substitutionBaseType",
  "target_constraintType",
  "target_evolvingArrayElementType",
  "target_evolvingArrayFinalType",
  "target_aliasType",
] satisfies AwardId[];
type TypeRelationMetricsAwardId = (typeof typeRelationMetrics)[number];

const extractTargetAwardId = <T extends AwardId>(property: T) =>
  property.replace("target_", "") as T extends `target_${infer U}` ? U : never;

const useTypeRelationMetricsValue = () => {
  const { data: typeGraph } = useTypeGraphLimitedNodeAndLinkStats();
  if (!typeGraph) {
    return () => 0;
  }
  const { linkStats } = typeGraph;

  return (awardId: TypeRelationMetricsAwardId): number => {
    switch (awardId) {
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
      case "target_aliasType": {
        const linkStatProperty = extractTargetAwardId(awardId);
        return linkStats[linkStatProperty]?.byTarget.max ?? 0;
      }

      default:
        awardId satisfies never;
        throw new Error(`Unknown award: ${awardId}`);
    }
  };
};

export const TypeRelationMetricsNavItems = () => {
  const getValue = useTypeRelationMetricsValue();
  return (
    <>
      <ListSubheader>Type Relation Metrics</ListSubheader>

      {typeRelationMetrics.map(awardId => (
        <AwardNavItem
          key={awardId}
          awardId={awardId}
          value={getValue(awardId)}
        />
      ))}
    </>
  );
};

export const TypeRelationMetricsAward = ({
  awardId,
}: {
  awardId: TypeRelationMetricsAwardId;
}) => {
  return <RelationAward key={awardId} awardId={awardId} />;
};
