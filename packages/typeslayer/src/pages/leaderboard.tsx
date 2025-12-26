import { Box, Divider, Paper, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { InlineCode } from "../components/inline-code";

type LeaderboardNumber = {
  id: string;
  label: string;
  subtitle: string;

  winner: number;
  median: number;
  mean: number;
  standardDeviation: number;
  samples: number;
  top10: number[];
  bottom10: number[];
};

const useLeaderboardStats = (): { data: LeaderboardNumber[] | null } => {
  return {
    data: [
      {
        id: "total-types",
        label: "Total Types",
        subtitle: "number of types in a project",
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
        winner: 0,
        median: 0,
        mean: 0,
        standardDeviation: 0,
        samples: 0,
        top10: [],
        bottom10: [],
      },
      {
        id: "total-relations1",
        label: "Total Relations",
        subtitle: "number of relations between types",
        winner: 0,
        median: 0,
        mean: 0,
        standardDeviation: 0,
        samples: 0,
        top10: [],
        bottom10: [],
      },
      {
        id: "total-relations2",
        label: "Total Relations",
        subtitle: "number of relations between types",
        winner: 0,
        median: 0,
        mean: 0,
        standardDeviation: 0,
        samples: 0,
        top10: [],
        bottom10: [],
      },
      {
        id: "total-relations3",
        label: "Total Relations",
        subtitle: "number of relations between types",
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
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const selected = stats
    ? stats[hoveredIndex !== null ? hoveredIndex : selectedIndex]
    : null;

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
            divider={<Divider orientation="horizontal" flexItem />}
          >
            {[
              ...stats,
              ...stats,
              ...stats,
              ...stats,
              ...stats,
              ...stats,
              ...stats,
              ...stats,
              ...stats,
              ...stats,
            ].map(leaderboardNumber => (
              <LeaderboardNumberCard
                key={leaderboardNumber.id}
                leaderboardNumber={leaderboardNumber}
                isSelected={selectedIndex === stats.indexOf(leaderboardNumber)}
                isHovered={hoveredIndex === stats.indexOf(leaderboardNumber)}
                onMouseEnter={() =>
                  setHoveredIndex(stats.indexOf(leaderboardNumber))
                }
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() =>
                  setSelectedIndex(stats.indexOf(leaderboardNumber))
                }
              />
            ))}
          </Stack>
        ) : null}

        {selected ? (
          <Paper
            sx={{
              mx: 2,
              mb: 2,
              p: 2,
              width: "40%",
              minWidth: "40%",
              maxWidth: "40%",
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

            <Stack>
              <Typography>
                Samples:{" "}
                <InlineCode>{selected.samples.toLocaleString()}</InlineCode>
              </Typography>
              <Typography>
                Median:{" "}
                <InlineCode>{selected.median.toLocaleString()}</InlineCode>
              </Typography>
              <Typography>
                Mean: <InlineCode>{selected.mean.toLocaleString()}</InlineCode>
              </Typography>
              <Typography>
                Standard Deviation:{" "}
                <InlineCode>
                  {selected.standardDeviation.toLocaleString()}
                </InlineCode>
              </Typography>
            </Stack>

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
        ) : null}
      </Stack>
    </Stack>
  );
};

const GroupOfTen = ({ label, values }: { label: string; values: number[] }) => {
  return (
    <Stack>
      <Typography variant="h6" gutterBottom>
        {label}
      </Typography>
      <Stack>
        {values.map((value, index) => (
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
        ))}
      </Stack>
    </Stack>
  );
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
        <Typography variant="subtitle1">
          {leaderboardNumber.subtitle}
        </Typography>
      </Stack>

      <Stack sx={{ flexDirection: "column", alignItems: "flex-end" }}>
        <Typography variant="h4">
          <InlineCode>{leaderboardNumber.winner.toLocaleString()}</InlineCode>
        </Typography>

        <Typography variant="body2" color="textSecondary">
          median{" "}
          <span style={{ fontFamily: "monospace" }}>
            {leaderboardNumber.median.toLocaleString()}
          </span>
        </Typography>
      </Stack>
    </Stack>
  );
};
