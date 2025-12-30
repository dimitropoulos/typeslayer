/** biome-ignore-all lint/suspicious/noArrayIndexKey: slim shady just don't give a fuck */
import type { SvgIconComponent } from "@mui/icons-material";
import ArrowDownward from "@mui/icons-material/ArrowDownward";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import AttachFile from "@mui/icons-material/AttachFile";
import DataArray from "@mui/icons-material/DataArray";
import DataObject from "@mui/icons-material/DataObject";
import Description from "@mui/icons-material/Description";
import DriveFileRenameOutline from "@mui/icons-material/DriveFileRenameOutline";
import FileCopy from "@mui/icons-material/FileCopy";
import HourglassBottom from "@mui/icons-material/HourglassBottom";
import QueryStats from "@mui/icons-material/QueryStats";
import SupervisorAccount from "@mui/icons-material/SupervisorAccount";
import Timelapse from "@mui/icons-material/Timelapse";
import {
  Box,
  Button,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Paper,
  Skeleton,
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
import { analyzeTraceInfo } from "@typeslayer/analyze-trace/browser";
import { depthLimitInfo, typeRelationInfo } from "@typeslayer/validate";
import { useCallback, useState } from "react";
import { InlineCode } from "../components/inline-code";
import { formatBytesSize, randBetween, useKonami } from "../components/utils";
import { useToast } from "../contexts/toast-context";
import { panelBackground } from "../theme";
import type { LinkKind } from "../types/type-graph";

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

  const { showToast } = useToast();

  const [isDebugMode, setIsDebugMode] = useState(false);
  const toggleDebugMode = () => setIsDebugMode(d => !d);
  useKonami(toggleDebugMode);

  const invalidate = useCallback(async () => {
    try {
      const response = await fetch(
        "https://typeslayer-analytics.typeslayer.workers.dev/invalidate",
      );
      showToast({
        message: `Leaderboard cache invalidated: ${await response.text()}`,
        severity: "success",
      });
    } catch (error) {
      showToast({
        message: `Failed to invalidate leaderboard cache: ${error}`,
        severity: "error",
      });
    }
  }, [showToast]);

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

          {isDebugMode ? (
            <Button onClick={invalidate} variant="contained" sx={{ mt: 2 }}>invalidate leaderboard cache</Button>
          ) : null}
        </Stack>
        {isLoading ? (
          <LeaderboardNavSkeleton />
        ) : stats ? (
          <Stack
            sx={{
              overflowY: "auto",
              height: "100%",
              maxHeight: "100%",
              minHeight: 0,
            }}
          >
            {sortedStats.map(([groupId, stats]) => (
              <List key={groupId}>
                <ListSubheader>{groupInfo[groupId].label}</ListSubheader>
                {stats.map(leaderboardNumber => (
                  <LeaderboardNumberListItem
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
        ) : (
          <span>error</span>
        )}
      </Stack>

      {isLoading ? (
        <SelectedSkeleton />
      ) : selected ? (
        <SelectedLeaderboardNumberDetails selected={selected} />
      ) : null}
    </Stack>
  );
};

const SelectedSkeleton = () => {
  return (
    <Stack
      sx={{
        margin: "32px",
        overflow: "hidden",
        flexShrink: 0,
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
      }}
    >
      <Stack
        sx={{
          flexDirection: "row",
          alignItems: "flex-end",
          marginBottom: "10px",
          marginTop: "2px",
        }}
      >
        <Skeleton variant="rectangular" height={24} width={112} />
        <Skeleton
          variant="rectangular"
          height={18}
          width={40}
          sx={{ marginLeft: "16px" }}
        />
      </Stack>

      <Skeleton
        variant="rectangular"
        height={20}
        width={200}
        sx={{ marginTop: "2px", marginBottom: 2 }}
      />

      <Skeleton variant="rectangular" height={162} width={368} sx={{ mb: 2 }} />
      <Stack sx={{ flexDirection: "row", gap: 2 }}>
        <Skeleton variant="rectangular" height={300} width={176} />
        <Skeleton variant="rectangular" height={300} width={176} />
      </Stack>
    </Stack>
  );
};

const ListSubheaderSkeleton = ({ width }: { width?: number }) => {
  return (
    <ListSubheader>
      <Skeleton
        sx={{
          height: 20,
          my: "6px",
          width: width ?? randBetween(10, 150),
          backgroundColor: t => `${t.palette.secondary.dark}40`,
        }}
      />
    </ListSubheader>
  );
};

const listItemButtonSx = ({
  isHovered,
  isSelected,
}: {
  isHovered: boolean;
  isSelected: boolean;
}) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  borderColor: isSelected ? "primary.main" : "transparent",
  backgroundColor: isHovered || isSelected ? "action.hover" : "inherit",
  cursor: "pointer",
  overflow: "hidden",
});

const ListItemSkeleton = ({ isSelected = false }: { isSelected?: boolean }) => {
  return (
    <ListItemButton
      sx={{
        ...listItemButtonSx({ isSelected, isHovered: false }),
        mr: 2.5,
      }}
      dense
    >
      <ListItemIcon sx={{ minWidth: 24, pr: 1 }}>
        <Skeleton variant="circular" width={20} height={20} />
      </ListItemIcon>

      <Typography>
        <Skeleton
          sx={{
            height: 24,
            my: "2px",
            width: randBetween(70, 150),
          }}
        />
      </Typography>
      <span style={{ flexGrow: 1 }} />

      <Skeleton
        sx={{
          width: randBetween(30, 100),
          backgroundColor: t => `${t.palette.secondary.dark}40`,
        }}
      />
    </ListItemButton>
  );
};

const LeaderboardNavSkeleton = () => {
  return (
    <List>
      <ListSubheaderSkeleton width={90} />
      {Array.from({ length: 5 }).map((_, i) => (
        <ListItemSkeleton key={i} isSelected={i === 0} />
      ))}
      <ListSubheaderSkeleton width={65} />
      {Array.from({ length: 3 }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
      <ListSubheaderSkeleton width={155} />
      {Array.from({ length: 100 }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </List>
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

const getItemIcon = (id: LeaderboardNumber["id"]) => {
  if (id.startsWith("source_relations") || id.startsWith("target_relations")) {
    // get the data after the last |
    const lookup = id.split("|")[2] as LinkKind;
    const entry = typeRelationInfo[lookup as keyof typeof typeRelationInfo];
    if (entry) {
      return entry.icon;
    }
  }

  if (Object.keys(depthLimitInfo).includes(id)) {
    return depthLimitInfo[id as keyof typeof depthLimitInfo].icon;
  }

  if (Object.keys(analyzeTraceInfo).includes(id)) {
    return analyzeTraceInfo[id as keyof typeof analyzeTraceInfo].icon;
  }

  switch (id) {
    case "total-types":
      return DataObject;
    case "total-relations":
      return SupervisorAccount;
    case "time-to-typecheck":
      return HourglassBottom;
    case "max-single-file-duration":
      return Timelapse;
    case "total-files":
      return AttachFile;
    case "types-json-size":
      return Description;
    case "trace-json-size":
      return Description;
    case "trace-count":
      return DriveFileRenameOutline;
    case "duplicatePackageInstances":
      return FileCopy;
    default:
      return DataArray;
  }
};

const LeaderboardNumberListItem = ({
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

  const ItemIcon = getItemIcon(leaderboardNumber.id);

  return (
    <ListItemButton
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      sx={listItemButtonSx({ isSelected, isHovered })}
      dense
    >
      <ListItemIcon sx={{ minWidth: 24, pr: 1 }}>
        <ItemIcon />
      </ListItemIcon>

      <ListItemText primary={leaderboardNumber.label} />

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
