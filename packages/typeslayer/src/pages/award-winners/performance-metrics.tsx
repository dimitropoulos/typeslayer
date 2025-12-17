import {
  Alert,
  AlertTitle,
  Box,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Stack,
  Typography,
} from "@mui/material";
import type { HotSpot } from "@typeslayer/analyze-trace/browser";
import { useCallback, useState } from "react";
import { CenterLoader } from "../../components/center-loader";
import { NoData } from "../../components/no-data";
import { OpenablePath } from "../../components/openable-path";
import {
  useAnalyzeTrace,
  useProjectRoot,
  useRelativePaths,
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

const getFilename = (path: string | undefined) => {
  if (!path) {
    return "<no file>";
  }
  return path?.split("/").slice(-1)[0];
};

const ShowHotSpots = () => {
  const relativePaths = useRelativePaths();
  const projectRoot = useProjectRoot();
  const { data: analyzeTrace, isLoading } = useAnalyzeTrace();
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const handleListItemClick = useCallback(
    (_event: React.MouseEvent<HTMLDivElement, MouseEvent>, index: number) => {
      setSelectedIndex(index);
    },
    [],
  );

  if (
    relativePaths.isLoading ||
    projectRoot.isLoading ||
    relativePaths.data === undefined ||
    projectRoot.data === undefined
  ) {
    return null;
  }

  const hotSpots = analyzeTrace?.hotSpots ?? [];

  const firstHotSpot = hotSpots[0];
  const hasItems = hotSpots.length > 0;
  const hasData = analyzeTrace !== undefined;
  const Icon = awards.perf_hotSpots.icon;

  const selectedNode: HotSpot | undefined = hotSpots[selectedIndex];

  const items = (
    <List>
      {hotSpots.map(({ path, timeMs }, index) => {
        const relativeTime = timeMs / firstHotSpot.timeMs;
        return (
          <ListItemButton
            key={path}
            selected={index === selectedIndex}
            onClick={event => handleListItemClick(event, index)}
          >
            <ListItemText>
              <Typography variant="h6" justifyContent="center">
                {getFilename(path)}
              </Typography>
              <Stack gap={0.5}>
                <MaybePathCaption maybePath={path} />
                <InlineBarGraph
                  label={`${timeMs.toLocaleString()}ms`}
                  width={`${relativeTime * 100}%`}
                />
              </Stack>
            </ListItemText>
          </ListItemButton>
        );
      })}
    </List>
  );

  const noData = (
    <Box sx={{ mr: 2 }}>
      <NoData />
    </Box>
  );

  const nonePresent = (
    <Alert severity="success" sx={{ mx: 1 }}>
      <AlertTitle>No hot spots found.</AlertTitle>
      That's a good thing!
    </Alert>
  );

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
          title="Hot Spots"
          subtitle="This is a list of files that took longer than other files (relatively speaking) for TypeScript to analyze.  It's not always a guarantee that it's because something wrong (for example, it could just legit be a big big file with lots going on), but it's something to look into to confirm."
          icon={<Icon fontSize="large" />}
        />
        {isLoading ? (
          <CenterLoader />
        ) : hasData ? (
          hasItems ? (
            items
          ) : (
            nonePresent
          )
        ) : (
          noData
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
        {selectedNode ? <HotSpotItem hotSpot={selectedNode} /> : null}
      </Box>
    </Stack>
  );
};

type CircularHotSpot = HotSpot & {
  children: CircularHotSpot[];
};

const Span = ({
  hotSpot,
  parentTimeMs,
  onSelect,
  depth = 0,
}: {
  hotSpot: CircularHotSpot;
  parentTimeMs: number;
  onSelect: (hotSpot: CircularHotSpot) => void;
  depth?: number;
}) => {
  const widthPercentage = (hotSpot.timeMs / parentTimeMs) * 100;
  const hasChildren = hotSpot.children.length > 0;

  return (
    <Stack sx={{ width: `${widthPercentage}%` }}>
      <Box
        onClick={() => onSelect(hotSpot)}
        sx={{
          width: "100%",
          minHeight: "24px",
          backgroundColor: `hsl(${(depth * 137) % 360}, 60%, 20%)`,
          border: "1px solid rgba(0, 0, 0, 0.2)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          px: 1,
          fontSize: "12px",
          color: "white",
          transition: "opacity 0.2s",
          "&:hover": {
            opacity: 0.8,
          },
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {hotSpot.description} ({hotSpot.timeMs}ms)
      </Box>
      {hasChildren && (
        <Stack direction="row" sx={{ width: "100%", gap: 0, mt: 0.5 }}>
          {hotSpot.children.map((child: CircularHotSpot, index) => (
            <Span
              // biome-ignore lint/suspicious/noArrayIndexKey: fuck off bro
              key={index}
              hotSpot={child}
              parentTimeMs={hotSpot.timeMs}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
};

const HotSpotItem = ({ hotSpot: rootHotSpot }: { hotSpot: HotSpot }) => {
  const [selectedSpan, setSelectedSpan] = useState<CircularHotSpot | null>(
    null,
  );

  const displayedSpan = selectedSpan || (rootHotSpot as CircularHotSpot);
  const { path, timeMs, description, types } = displayedSpan;

  return (
    <Stack gap={3}>
      <Stack>
        <Typography variant="h5" gutterBottom>
          {description}
        </Typography>
        {path ? <OpenablePath absolutePath={path} /> : null}
        {types && (
          <Typography variant="body2" color="text.secondary">
            Types: {types.join(", ")}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          Time: {timeMs}ms
        </Typography>
      </Stack>

      <Stack gap={1}>
        <Typography variant="h6">Execution Tree</Typography>
        <Span
          hotSpot={rootHotSpot as CircularHotSpot}
          parentTimeMs={rootHotSpot.timeMs}
          onSelect={setSelectedSpan}
        />
      </Stack>
    </Stack>
  );
};

const performanceMetrics = ["perf_hotSpots"] satisfies AwardId[];
type PerformanceMetricsAwardId = (typeof performanceMetrics)[number];

const usePerformanceMetricsValue = () => {
  const { data: analyzeTrace } = useAnalyzeTrace();

  return useCallback(
    (awardId: PerformanceMetricsAwardId): number => {
      switch (awardId) {
        case "perf_hotSpots": {
          const hotSpots = analyzeTrace?.hotSpots ?? [];
          return hotSpots.length;
        }
        default:
          awardId satisfies never;
          throw new Error(`Unknown award: ${awardId}`);
      }
    },
    [analyzeTrace],
  );
};

export const PerformanceMetricsNavItems = () => {
  const getValue = usePerformanceMetricsValue();

  return (
    <>
      <ListSubheader>Performance Metrics</ListSubheader>

      {performanceMetrics.map(awardId => (
        <AwardNavItem
          key={awardId}
          awardId={awardId}
          value={getValue(awardId)}
        />
      ))}
    </>
  );
};

export const PerformanceMetricsAward = ({
  awardId,
}: {
  awardId: PerformanceMetricsAwardId;
}) => {
  if (awardId !== "perf_hotSpots") {
    throw new Error(`Unknown award: ${awardId}`);
  }

  return <ShowHotSpots />;
};
