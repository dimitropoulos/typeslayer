import {
  Alert,
  Box,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Stack,
} from "@mui/material";
import type { TypeId } from "@typeslayer/validate";
import { useState } from "react";
import { DisplayRecursiveType } from "../../components/display-recursive-type";
import { SimpleTypeSummary } from "../../components/type-summary";
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

const typeMetrics = [
  "type_unionTypes",
  "type_intersectionTypes",
  "type_typeArguments",
  "type_aliasTypeArguments",
] satisfies AwardId[];
type TypeMetricsAwardId = (typeof typeMetrics)[number];

const getTypeStatProperty = <T extends TypeMetricsAwardId>(awardId: T) => {
  return awardId.replace("type_", "") as T extends `type_${infer Stat}`
    ? Stat
    : never;
};

const useTypeMetricsValue = () => {
  const { data: typeGraph } = useTypeGraph();
  if (!typeGraph) {
    return () => 0;
  }

  const { nodeStats } = typeGraph;

  return (awardId: TypeMetricsAwardId): number => {
    switch (awardId) {
      case "type_unionTypes":
      case "type_intersectionTypes":
      case "type_typeArguments":
      case "type_aliasTypeArguments":
        return nodeStats[getTypeStatProperty(awardId)].max;
      default:
        awardId satisfies never;
        throw new Error(`Unknown award: ${awardId}`);
    }
  };
};

export const TypeMetricsNavItems = () => {
  const getValue = useTypeMetricsValue();
  return (
    <>
      <ListSubheader>Type Metrics</ListSubheader>

      {typeMetrics.map(awardId => (
        <AwardNavItem
          key={awardId}
          awardId={awardId}
          value={getValue(awardId)}
        />
      ))}
    </>
  );
};

export function TypeMetricsAward({ awardId }: { awardId: TypeMetricsAwardId }) {
  const { title, description, icon: Icon, unit } = awards[awardId];

  const [selectedIndex, setSelectedIndex] = useState(0);
  const { data: typeGraph } = useTypeGraph();

  if (!typeGraph) {
    return <span>Loading...</span>;
  }

  const handleListItemClick = (
    _event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    index: number,
  ) => {
    setSelectedIndex(index);
  };

  const nodeStat = awardId.replace("type_", "") as
    | "unionTypes"
    | "intersectionTypes"
    | "typeArguments"
    | "aliasTypeArguments";
  const { max, nodes } = typeGraph.nodeStats[nodeStat];

  const hasItems = nodes.length > 0;

  const selectedNode: TypeId | undefined = nodes[selectedIndex]?.[0];

  return (
    <Stack
      sx={{
        flexDirection: "row",
        alignItems: "flex-start",
        height: "100%",
      }}
    >
      <Stack
        sx={{
          width: AWARD_SELECTOR_COLUMN_WIDTH,
          background: hasItems ? "#000000" : "transparent",
          flexShrink: 0,
          gap: 2,
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

        {hasItems ? (
          <List>
            {nodes.map(([id, name, value, maybePath], index) => {
              return (
                <ListItemButton
                  selected={index === selectedIndex}
                  onClick={event => handleListItemClick(event, index)}
                  key={id}
                >
                  <ListItemText>
                    <Stack sx={{ flexGrow: 1 }} gap={0}>
                      <SimpleTypeSummary id={id} name={name} suppressActions />
                      <Stack gap={0.5}>
                        <MaybePathCaption maybePath={maybePath} />
                        <InlineBarGraph
                          label={`${value.toLocaleString()} ${unit}`}
                          width={`${(value / max) * 100}%`}
                        />
                      </Stack>
                    </Stack>
                  </ListItemText>
                </ListItemButton>
              );
            })}
          </List>
        ) : (
          <Alert severity="info">
            No {unit} found. That's unusual but not impossible.
          </Alert>
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
        {selectedNode ? <DisplayRecursiveType id={selectedNode} /> : null}
      </Box>
    </Stack>
  );
}
