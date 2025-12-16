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
import type { TypeId } from "@typeslayer/validate";
import { useMemo, useState } from "react";
import { CenterLoader } from "../../components/center-loader";
import { DisplayRecursiveType } from "../../components/display-recursive-type";
import { InlineCode } from "../../components/inline-code";
import { NoData } from "../../components/no-data";
import { ShowMoreChildren } from "../../components/show-more-children";
import {
  getHumanReadableName,
  SimpleTypeSummary,
  TypeSummary,
} from "../../components/type-summary";
import {
  useGetResolvedTypeById,
  useGetResolvedTypesByIds,
  useTypeGraph,
} from "../../hooks/tauri-hooks";
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
  const { data: typeGraph, isLoading: isLoadingTypeGraph } = useTypeGraph();

  const handleListItemClick = (
    _event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    index: number,
  ) => {
    setSelectedIndex(index);
  };
  const hasData = typeGraph !== undefined;

  const edgeStatProperty = getLinkStatProperty(awardId);
  const linkStats = typeGraph?.linkStats[edgeStatProperty];

  const targets = useMemo(() => {
    return linkStats?.links.map(link => link.targetId) ?? [];
  }, [linkStats]);

  const selectedItem = linkStats?.links[selectedIndex];
  const {
    data: partialIndexedTypeRegistry,
    isLoading: isLoadingPartialIndexedTypeRegistry,
  } = useGetResolvedTypesByIds(targets);

  const isLoading = isLoadingTypeGraph || isLoadingPartialIndexedTypeRegistry;

  const hasItems = linkStats && linkStats.links.length > 0;

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
      {linkStats?.links.map(({ targetId, sourceIds, path }, index) => {
        return (
          <ListItemButton
            selected={index === selectedIndex}
            onClick={event => handleListItemClick(event, index)}
            key={targetId}
          >
            <ListItemText>
              <Stack sx={{ flexGrow: 1 }} gap={0}>
                <SimpleTypeSummary
                  id={targetId}
                  loading={isLoadingPartialIndexedTypeRegistry}
                  name={getHumanReadableName(
                    partialIndexedTypeRegistry?.[targetId],
                  )}
                  suppressActions
                />
                <Stack gap={0.5}>
                  <MaybePathCaption maybePath={path} />
                  <InlineBarGraph
                    label={`${sourceIds.length.toLocaleString()} ${unit}`}
                    width={`${(sourceIds.length / linkStats.max) * 100}%`}
                  />
                </Stack>
              </Stack>
            </ListItemText>
          </ListItemButton>
        );
      })}
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
            <DisplayRecursiveType id={selectedItem.targetId} />

            {selectedItem && hasItems && (
              <>
                <Divider />
                <Stack gap={1}>
                  <Typography variant="h6">
                    {selectedItem.sourceIds.length.toLocaleString()} {unit}
                  </Typography>
                  <List dense sx={{ backgroundColor: "transparent" }}>
                    <ShowMoreChildren incrementsOf={50}>
                      {selectedItem.sourceIds.map(sourceId => (
                        <TypeMetricsListItem key={sourceId} typeId={sourceId} />
                      ))}
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
      <TypeSummary resolvedType={resolvedType} />

      <Stack
        className="action-buttons"
        sx={{
          opacity: 0,
          pointerEvents: "none",
          flexDirection: "row",
          gap: 0.5,
          flexShrink: 0,
        }}
      ></Stack>
    </ListItem>
  );
};

const typeRelationMetrics = [
  "relation_union",
  "relation_intersection",
  "relation_typeArgument",
  "relation_instantiated",
  "relation_aliasTypeArgument",
  "relation_conditionalCheck",
  "relation_conditionalExtends",
  "relation_conditionalFalse",
  "relation_conditionalTrue",
  "relation_indexedAccessObject",
  "relation_indexedAccessIndex",
  "relation_keyof",
  "relation_reverseMappedSource",
  "relation_reverseMappedMapped",
  "relation_reverseMappedConstraint",
  "relation_substitutionBase",
  "relation_constraint",
  "relation_evolvingArrayElement",
  "relation_evolvingArrayFinal",
  "relation_alias",
] satisfies AwardId[];
type TypeRelationMetricsAwardId = (typeof typeRelationMetrics)[number];

const getLinkStatProperty = <T extends AwardId>(property: T) =>
  property.replace("relation_", "") as T extends `relation_${infer U}`
    ? U
    : never;

const useTypeRelationMetricsValue = () => {
  const { data: typeGraph } = useTypeGraph();
  if (!typeGraph) {
    return () => 0;
  }
  const { linkStats } = typeGraph;

  return (awardId: TypeRelationMetricsAwardId): number => {
    switch (awardId) {
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
      case "relation_alias": {
        const linkStatProperty = getLinkStatProperty(awardId);
        return linkStats[linkStatProperty]?.max ?? 0;
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
