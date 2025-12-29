import type { SvgIconComponent } from "@mui/icons-material";
import ArrowDownward from "@mui/icons-material/ArrowDownward";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import QueryStats from "@mui/icons-material/QueryStats";
import {
  Box,
  List,
  ListItemButton,
  ListSubheader,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import {
  type GroupId,
  groupIds,
  groupInfo,
  type LeaderboardNumber,
  type LeaderboardNumberFormat,
} from "@typeslayer/analytics";
import { useState } from "react";
import { InlineCode } from "../components/inline-code";
import { formatBytesSize } from "../components/utils";
import { panelBackground } from "../theme";

const useLeaderboardStats = () => {
  return useQuery<LeaderboardNumber[]>({
    queryKey: ["leaderboard-stats"],
    queryFn: async () => {
      const response = await fetch(
        "https://typeslayer-analytics.typeslayer.workers.dev/leaderboard",
      );
      if (!response.ok) {
        throw new Error(
          `Failed to fetch leaderboard stats: ${response.status}`,
        );
      }
      const data: LeaderboardNumber[] = await response.json();
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const LeaderboardPage = () => {
  const { data: stats, isLoading } = useLeaderboardStats();
  const [selectedId, setSelectedId] =
    useState<LeaderboardNumber["id"]>("total-types");
  const [hoveredId, setHoveredId] = useState<LeaderboardNumber["id"] | null>(
    null,
  );

  const selected = stats
    ? stats.find(
        stat => stat.id === (hoveredId !== null ? hoveredId : selectedId),
      ) || null
    : null;

  const sortedStats: [GroupId, LeaderboardNumber[]][] = stats
    ? groupIds.map(groupId => [
        groupId,
        stats.filter(stat => stat.groupId === groupId),
      ])
    : [];

  return (
    <Stack
      sx={{
        flexDirection: "row",
        width: "100%",
        height: "100vh",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <Stack
        sx={{
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          width: "50%",
          maxWidth: "400px",
          background: "black",
          borderRight: 1,
          borderColor: "divider",
        }}
      >
        <Stack
          sx={{
            p: 1,
            mx: 2,
            mt: 1,
          }}
        >
          <Typography variant="h4" sx={{}}>
            Leaderboard
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              color: "text.secondary",
              mt: 1,
              lineHeight: 1.2,
            }}
          >
            this started as a joke, but over time it became clear that having
            context on "how big is way too big" is actually tangibly useful.
          </Typography>
        </Stack>
        {stats ? (
          <Stack
            sx={{
              overflowY: "auto",
              height: "100%",
              maxHeight: "100%",
              minHeight: 0,
            }}
          >
            {sortedStats.map(([groupId, stats]) => (
              <List key={groupId} sx={{}}>
                <ListSubheader>{groupInfo[groupId].label}</ListSubheader>
                {stats.map(leaderboardNumber => (
                  <LeaderboardNumberCard
                    key={leaderboardNumber.id}
                    leaderboardNumber={leaderboardNumber}
                    isSelected={selectedId === leaderboardNumber.id}
                    isHovered={hoveredId === leaderboardNumber.id}
                    onMouseEnter={() => setHoveredId(leaderboardNumber.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => setSelectedId(leaderboardNumber.id)}
                  />
                ))}
              </List>
            ))}
          </Stack>
        ) : isLoading ? (
          <span>loading...</span>
        ) : (
          <span>error</span>
        )}
      </Stack>

      {selected ? (
        <SelectedLeaderboardNumberDetails selected={selected} />
      ) : null}
    </Stack>
  );
};

const PaperHeading = ({
  title,
  icon: Icon,
}: {
  title: string;
  icon: SvgIconComponent;
}) => {
  return (
    <Stack
      sx={{
        flexDirection: "row",
        px: 1,
        py: 0.5,
        backgroundColor: "background.paper",
        gap: 1,
        alignItems: "center",
      }}
    >
      <Icon fontSize="small" color="disabled" />
      <Typography sx={{ fontSize: "14px", fontWeight: "bold" }}>
        {title}
      </Typography>
    </Stack>
  );
};

const SelectedLeaderboardNumberDetails = ({
  selected,
}: {
  selected: LeaderboardNumber;
}) => {
  const format = leaderboardNumberFormatter(selected.format);
  return (
    <Box
      sx={{
        mx: 2,
        my: 2,
        p: 2,
        width: "40%",
        maxWidth: 400,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        alignSelf: "flex-start",
        maxHeight: "calc(100% - 16px)",
        overflowY: "auto",
      }}
    >
      <Stack sx={{ gap: 0.5 }}>
        <Typography variant="h4">
          {selected.label}
          <Typography
            variant="subtitle2"
            sx={{
              alignSelf: "flex-end",
              display: "inline",
              ml: 1,
            }}
          >
            ({selected.format})
          </Typography>
        </Typography>
        <Typography variant="subtitle1">{selected.subtitle}</Typography>
      </Stack>

      <Paper
        sx={{
          background: panelBackground,
        }}
      >
        <PaperHeading title="Stats" icon={QueryStats} />
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell>Median</TableCell>
              <TableCell align="right">
                <InlineCode>{format(selected.median)}</InlineCode>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Mean</TableCell>
              <TableCell align="right">
                <InlineCode>{format(selected.mean)}</InlineCode>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Standard Deviation</TableCell>
              <TableCell align="right">
                <InlineCode>
                  {selected.standardDeviation.toLocaleString()}
                </InlineCode>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Samples</TableCell>
              <TableCell align="right">
                <InlineCode>{selected.samples.toLocaleString()}</InlineCode>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      <Stack
        sx={{
          display: "flex",
          flexDirection: "row",
          gap: 2,
          width: "100%",
          flexGrow: 1,
          justifyContent: "space-between",
        }}
      >
        <GroupOfTen label="Top" values={selected.top10.map(format)} />
        <GroupOfTen label="Bottom" values={selected.bottom10.map(format)} />
      </Stack>
    </Box>
  );
};

const GroupOfTen = ({
  label,
  values,
}: {
  label: "Top" | "Bottom";
  values: string[];
}) => {
  return (
    <Paper
      sx={{
        alignSelf: "stretch",
        width: "100%",
        background: panelBackground,

        fontSize: 14,
      }}
    >
      <PaperHeading
        title={`${label} 10`}
        icon={label === "Top" ? ArrowUpward : ArrowDownward}
      />
      <Stack sx={{ py: 1, px: 2 }}>
        {values.length === 0 ? (
          <Typography>no data</Typography>
        ) : (
          values.map((value, index) => (
            <Stack
              sx={{
                flexDirection: "row",
                alignItems: "center",
                gap: 1,
                justifyContent: "flex-end",
              }}
              // biome-ignore lint/suspicious/noArrayIndexKey: don't care, bro
              key={index}
            >
              <InlineCode>{value}</InlineCode>
            </Stack>
          ))
        )}
      </Stack>
    </Paper>
  );
};

const leaderboardNumberFormatter =
  (format: LeaderboardNumberFormat) =>
  (value: number): string => {
    switch (format) {
      case "count":
        return value.toLocaleString();
      case "bytes":
        return formatBytesSize(value);
      case "milliseconds": {
        const v = value / 1000;
        if (v < 1000) {
          return `${v.toFixed(1)} ms`;
        } else if (v < 60000) {
          return `${(v / 1000).toFixed(1)} s`;
        } else {
          return `${(v / 60000).toFixed(1)} m`;
        }
      }
      default:
        return value.toString();
    }
  };

const LeaderboardNumberCard = ({
  leaderboardNumber,
  isSelected,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: {
  leaderboardNumber: LeaderboardNumber | undefined;
  isSelected: boolean;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}) => {
  if (!leaderboardNumber) {
    return <div>No data</div>;
  }

  const format = leaderboardNumberFormatter(leaderboardNumber.format);

  return (
    <ListItemButton
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      sx={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderColor: isSelected ? "primary.main" : "transparent",
        backgroundColor: isHovered || isSelected ? "action.hover" : "inherit",
        cursor: "pointer",
        overflow: "hidden",
      }}
      dense
    >
      <Typography>{leaderboardNumber.label}</Typography>
      <InlineCode
        style={{
          fontSize: 13,
          fontWeight: "bold",
        }}
      >
        {format(leaderboardNumber.winner)}
      </InlineCode>
    </ListItemButton>
  );
};
