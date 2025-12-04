import {
  Alert,
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
import { useState } from "react";
import { DisplayRecursiveType } from "../../components/display-recursive-type";
import {
  getHumanReadableName,
  SimpleTypeSummary,
  TypeSummary,
} from "../../components/type-summary";
import { useTypeGraph } from "../../hooks/tauri-hooks";
import { AwardNavItem } from "./award-nav-item";
import {
  AWARD_SELECTOR_COLUMN_WIDTH,
  type AwardId,
  awards,
  MaybePathCaption,
} from "./awards";
import { InlineBarGraph } from "./inline-bar-graph";
import { TitleSubtitle } from "./title-subtitle";
import { useTypeRegistry } from "./use-type-registry";

export function RelationAward({
  awardId,
}: {
  awardId: TypeRelationMetricsAwardId;
}) {
  const { title, description, icon: Icon, unit } = awards[awardId];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { data: typeGraph, isLoading } = useTypeGraph();
  const typeRegistry = useTypeRegistry();

  const handleListItemClick = (
    _event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    index: number,
  ) => {
    setSelectedIndex(index);
  };

  if (isLoading) {
    return <Typography>Loading...</Typography>;
  }

  const edgeStatProperty = getEdgeStatProperty(awardId);
  const edgeStats = typeGraph?.edgeStats[edgeStatProperty];

  if (!edgeStats) {
    return <Typography>No type {edgeStatProperty} data available.</Typography>;
  }

  const selectedItem = edgeStats.links[selectedIndex];

  const hasItems = edgeStats.links.length > 0;

  const noneFound = (
    <Box
      sx={{
        mt: 1,
      }}
    >
      <Alert severity="info">
        You codebase has no types with this relation.
        <br />
        <br />
        That's not necessarily a good or bad thing.
        <br />
        <br />
        Just.. a thing.
      </Alert>
    </Box>
  );

  return (
    <Stack
      sx={{ flexDirection: "row", alignItems: "flex-start", height: "100%" }}
    >
      <Stack
        sx={{
          width: AWARD_SELECTOR_COLUMN_WIDTH,
          flexShrink: 0,
          p: 3,
          overflowY: "auto",
          maxHeight: "100%",
        }}
      >
        <TitleSubtitle
          title={title}
          subtitle={description}
          icon={<Icon fontSize="large" />}
        />
        <Stack sx={{ my: 2 }}>
          {hasItems ? (
            <List>
              {edgeStats.links.map(([typeId, sourceIds, maybePath], index) => (
                <ListItemButton
                  selected={index === selectedIndex}
                  onClick={event => handleListItemClick(event, index)}
                  key={typeId}
                  sx={{ width: "100%" }}
                >
                  <ListItemText>
                    <Stack sx={{ flexGrow: 1 }} gap={0}>
                      <SimpleTypeSummary
                        id={typeId}
                        name={getHumanReadableName(typeRegistry[typeId])}
                      />
                      <Stack gap={0.5}>
                        <MaybePathCaption maybePath={maybePath} />
                        <InlineBarGraph
                          label={`${sourceIds.length.toLocaleString()} ${unit}`}
                          width={`${(sourceIds.length / edgeStats.max) * 100}%`}
                        />
                      </Stack>
                    </Stack>
                  </ListItemText>
                </ListItemButton>
              ))}
            </List>
          ) : (
            noneFound
          )}
        </Stack>
      </Stack>

      {hasItems ? <Divider orientation="vertical" /> : null}

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
            <DisplayRecursiveType id={selectedItem[0]} />

            {selectedItem && selectedItem[1].length > 0 && (
              <>
                <Divider />
                <Stack gap={1}>
                  <Typography variant="h6">
                    {selectedItem[1].length.toLocaleString()} {unit}
                  </Typography>
                  <List dense>
                    {selectedItem[1].map(sourceId => {
                      const sourceType = typeRegistry[sourceId];
                      return sourceType ? (
                        <ListItem key={sourceId}>
                          <TypeSummary resolvedType={sourceType} />
                        </ListItem>
                      ) : null;
                    })}
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

const getEdgeStatProperty = <T extends AwardId>(property: T) =>
  property.replace("relation_", "") as T extends `relation_${infer U}`
    ? U
    : never;

const useTypeRelationMetricsValue = () => {
  const { data: typeGraph } = useTypeGraph();
  if (!typeGraph) {
    return () => 0;
  }

  const { edgeStats } = typeGraph;

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
        const edgeStatProperty = getEdgeStatProperty(awardId);
        return edgeStats[edgeStatProperty].max;
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
