import {
  Alert,
  Box,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Stack,
} from "@mui/material";
import { type TypeId, typeRelationInfo } from "@typeslayer/validate";
import { useCallback, useState } from "react";
import { CenterLoader } from "../../components/center-loader";
import { DisplayRecursiveType } from "../../components/display-recursive-type";
import { NoData } from "../../components/no-data";
import { TypeSummary } from "../../components/type-summary";
import { useTypeGraphLimitedNodeAndLinkStats } from "../../hooks/tauri-hooks";
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
  "source_unionTypes",
  "source_intersectionTypes",
  "source_typeArguments",
  "source_aliasTypeArguments",
] satisfies AwardId[];
type TypeMetricsAwardId = (typeof typeMetrics)[number];

const getTypeStatProperty = <T extends TypeMetricsAwardId>(awardId: T) => {
  return awardId.replace("source_", "") as T extends `source_${infer Stat}`
    ? Stat
    : never;
};

const useTypeMetricsValue = () => {
  const { data: typeGraph } = useTypeGraphLimitedNodeAndLinkStats();
  if (!typeGraph) {
    return () => 0;
  }

  const { nodeStats } = typeGraph;

  return (awardId: TypeMetricsAwardId): number => {
    switch (awardId) {
      case "source_unionTypes":
      case "source_intersectionTypes":
      case "source_typeArguments":
      case "source_aliasTypeArguments":
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
  const { title, icon: Icon, unit } = awards[awardId];
  const { description } = typeRelationInfo[getTypeStatProperty(awardId)].source;

  const [selectedIndex, setSelectedIndex] = useState(0);
  const { data: typeGraph, isLoading } = useTypeGraphLimitedNodeAndLinkStats();
  console.log(typeGraph);

  const hasData = typeGraph !== undefined;

  const handleListItemClick = useCallback(
    (_event: React.MouseEvent<HTMLDivElement, MouseEvent>, index: number) => {
      setSelectedIndex(index);
    },
    [],
  );

  const nodeStat = awardId.replace("source_", "") as
    | "unionTypes"
    | "intersectionTypes"
    | "typeArguments"
    | "aliasTypeArguments";
  const { count, max, nodes } = typeGraph?.nodeStats[nodeStat] ?? {
    count: 0,
    max: 0,
    nodes: [],
  };

  const hasItems = count > 0;

  const items = (
    <List>
      {nodes.map(({ id, name, value, path }, index) => {
        return (
          <ListItemButton
            selected={index === selectedIndex}
            onClick={event => handleListItemClick(event, index)}
            key={id}
          >
            <ListItemText>
              <Stack sx={{ flexGrow: 1 }} gap={0}>
                <TypeSummary
                  typeId={id}
                  name={name}
                  flags={[]}
                  showFlags={false}
                  suppressActions
                />
                <Stack gap={0.5}>
                  <MaybePathCaption maybePath={path} />
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
  );

  const noneFound = (
    <Alert severity="info">
      No {unit} found. That's unusual but not impossible.
    </Alert>
  );

  const selectedNode: TypeId | undefined = nodes[selectedIndex]?.id;

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
        {selectedNode ? <DisplayRecursiveType id={selectedNode} /> : null}
      </Box>
    </Stack>
  );
}
