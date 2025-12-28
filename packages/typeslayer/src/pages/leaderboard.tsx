import {
  Divider,
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

/*

total types
total relations

size of types.json
size of relations.json


- number of files
- total duration
- max duration for a single file

add analyze-trace file statistics to analyze trace success event


*/

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
  const { data: stats } = useLeaderboardStats();
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
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        backgroundColor: "black",
        height: "100vh",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <Stack
        sx={{
          pl: 4,
          pr: 4,
          pt: 4,
          pb: 2,
        }}
      >
        <Typography variant="h2" sx={{}}>
          Leaderboard
        </Typography>
        <Typography
          variant="subtitle1"
          sx={{
            color: "text.secondary",
            mt: 1,
            maxWidth: "40%",
            lineHeight: 1.2,
          }}
        >
          this started as a joke, but over time it became clear that having
          context on "how big is way too big" is actually tangibly useful.
        </Typography>
      </Stack>

      <Stack
        sx={{
          flexDirection: "row",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
        divider={<Divider orientation="vertical" flexItem />}
      >
        {stats ? (
          <Stack
            sx={{
              width: "50%",
              minWidth: "50%",
              maxWidth: "50%",
              overflowY: "auto",
              background: "black",
              pr: 2,
              pl: 3,
              flexDirection: "column",
              height: "100%",
              maxHeight: "100%",
              minHeight: 0,
            }}
          >
            {sortedStats.map(([groupId, stats]) => (
              <Stack key={groupId} sx={{}}>
                <Typography
                  sx={{
                    fontWeight: "bold",
                    fontSize: 14,
                    mt: 2,
                    mb: 0.5,
                    textTransform: "uppercase",
                    color: "secondary.main",
                  }}
                >
                  {groupInfo[groupId].label}
                </Typography>
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
              </Stack>
            ))}
          </Stack>
        ) : null}

        {selected ? (
          <SelectedLeaderboardNumberDetails selected={selected} />
        ) : null}
      </Stack>
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
    <Paper
      sx={{
        mx: 2,
        mb: 2,
        p: 2,
        width: "40%",
        maxWidth: 400,
        display: "flex",
        flexDirection: "column",
        gap: 3,
        alignSelf: "flex-start",
        maxHeight: "calc(100% - 16px)",
        overflowY: "auto",
      }}
    >
      <Stack sx={{ gap: 0.5 }}>
        <Typography variant="h3">
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

      <Stack
        sx={{
          flexDirection: "row",
          gap: 3,
          width: "100%",
          flexGrow: 1,
          justifyContent: "space-between",
        }}
        divider={<Divider orientation="vertical" flexItem />}
      >
        <GroupOfTen label="Top 10" values={selected.top10.map(format)} />
        <GroupOfTen label="Bottom 10" values={selected.bottom10.map(format)} />
      </Stack>
    </Paper>
  );
};

const GroupOfTen = ({ label, values }: { label: string; values: string[] }) => {
  return (
    <Stack sx={{ alignSelf: "stretch", width: "100%" }}>
      <Typography variant="h6" gutterBottom align="right">
        {label}
      </Typography>
      <Stack>
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
    </Stack>
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
          return `${v.toFixed(1)}ms`;
        } else {
          return `${(v / 1000).toFixed(1)}s`;
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
    <Stack
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      sx={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        px: 2.5,
        py: 1.5,
        borderColor: isSelected ? "primary.main" : "transparent",
        backgroundColor: isHovered || isSelected ? "action.hover" : "inherit",
        cursor: "pointer",
      }}
      component={Paper}
    >
      <Stack>
        <Typography variant="h5">{leaderboardNumber.label}</Typography>
        <Typography variant="body2" color="textSecondary">
          {leaderboardNumber.subtitle}
        </Typography>
      </Stack>

      <Stack sx={{ flexDirection: "column", alignItems: "flex-end" }}>
        <Typography variant="h4">
          <InlineCode>{format(leaderboardNumber.winner)}</InlineCode>
        </Typography>

        <Typography variant="body2" color="textSecondary">
          <span style={{ fontFamily: "monospace" }}>
            {format(leaderboardNumber.median)}
          </span>{" "}
          median
        </Typography>
      </Stack>
    </Stack>
  );
};
