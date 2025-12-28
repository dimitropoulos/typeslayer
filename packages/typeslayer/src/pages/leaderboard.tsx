import { Divider, Paper, Stack, Table, TableBody, TableCell, TableRow, Typography } from "@mui/material";
import { useState } from "react";
import { InlineCode } from "../components/inline-code";
import { formatBytesSize } from "../components/utils";

const groupIds = [
  "type-metrics",
  "type-relation-metrics",
  "performance-metrics",
  "type-level-limits",
  "bundle-implications",
  "raw-data",
] as const;

type GroupId = (typeof groupIds)[number];

const groupInfo = {
  "type-level-limits": "Type Level Limits",
  "raw-data": "Raw Data Sizes",
  "bundle-implications": "Bundle Implications",
  "performance-metrics": "Performance Metrics",
  "type-metrics": "Type Metrics",
  "type-relation-metrics": "Type Relation Metrics",
} satisfies Record<GroupId, string>;

type LeaderboardNumberFormat = "number" | "bytes" | "milliseconds";

type LeaderboardNumber = {
  id: string;
  label: string;
  subtitle: string;
  groupId: GroupId;
  format: LeaderboardNumberFormat;

  winner: number;
  median: number;
  mean: number;
  standardDeviation: number;
  samples: number;
  top10: number[];
  bottom10: number[];
};

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

const useLeaderboardStats = (): { data: LeaderboardNumber[] | null } => {
  return {
    data: [
      {
        id: "total-types",
        label: "Total Types",
        subtitle: "number of types in a project",
        groupId: "type-metrics",
        format: "number",
        winner: 13_345_430,
        median: 198_932,
        mean: 1_234_567,
        standardDeviation: 2_345_678,
        samples: 75,
        top10: [
          13_345_430, 9_876_543, 7_654_321, 6_543_210, 5_432_109, 4_321_098,
          3_210_987, 2_109_876, 1_098_765, 987_654,
        ],
        bottom10: [
          10_123, 9_012, 8_901, 7_890, 6_789, 5_678, 4_567, 3_456, 2_345, 1_234,
        ],
      },
      {
        id: "total-relations",
        label: "Total Relations",
        subtitle: "number of relations between types",
        groupId: "type-relation-metrics",
        format: "number",
        winner: 0,
        median: 0,
        mean: 0,
        standardDeviation: 0,
        samples: 0,
        top10: [],
        bottom10: [],
      },
      {
        id: "types-json-size",
        label: "Types JSON Size",
        subtitle: "size of types.json file",
        groupId: "raw-data",
        format: "bytes",
        winner: 0,
        median: 0,
        mean: 0,
        standardDeviation: 0,
        samples: 0,
        top10: [],
        bottom10: [],
      },
      {
        id: "trace-json-size",
        label: "Trace JSON Size",
        subtitle: "size of trace.json file",
        groupId: "raw-data",
        format: "bytes",
        winner: 0,
        median: 0,
        mean: 0,
        standardDeviation: 0,
        samples: 0,
        top10: [],
        bottom10: [],
      },
      {
        id: "num-files",
        label: "Number of Files",
        subtitle: "number of files in the project",
        groupId: "bundle-implications",
        format: "number",
        winner: 0,
        median: 0,
        mean: 0,
        standardDeviation: 0,
        samples: 0,
        top10: [],
        bottom10: [],
      },
    ],
  };
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
                  {groupInfo[groupId]}
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
              gap: 1,
              alignSelf: "flex-start",
              maxHeight: "calc(100% - 16px)",
              overflowY: "auto",
            }}
          >
            <Stack>
              <Typography variant="h3">{selected.label}</Typography>
              <Typography variant="subtitle1">{selected.subtitle}</Typography>
            </Stack>

            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>Samples</TableCell>
                  <TableCell align="right">
                    <InlineCode>
                      {selected.samples.toLocaleString()}
                    </InlineCode>
                  </TableCell>
                </TableRow>
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
              </TableBody>
            </Table>

            <Stack
              sx={{
                flexDirection: "row",
                gap: 3,
                width: "100%",
                flexGrow: 1,
              }}
              divider={<Divider orientation="vertical" flexItem />}
            >
              <GroupOfTen label="Top 10" values={selected.top10} />
              <GroupOfTen label="Bottom 10" values={selected.bottom10} />
            </Stack>
          </Paper>
  )}

const GroupOfTen = ({ label, values }: { label: string; values: number[] }) => {
  return (
    <Stack>
      <Typography variant="h6" gutterBottom>
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
              <InlineCode>{value.toLocaleString()}</InlineCode>
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
      case "number":
        return value.toLocaleString();
      case "bytes":
        return formatBytesSize(value);
      case "milliseconds":
        if (value < 1000) {
          return `${value} ms`;
        } else {
          return `${(value / 1000).toFixed(2)} s`;
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
          median{" "}
          <span style={{ fontFamily: "monospace" }}>
            {format(leaderboardNumber.median)}
          </span>
        </Typography>
      </Stack>
    </Stack>
  );
};
