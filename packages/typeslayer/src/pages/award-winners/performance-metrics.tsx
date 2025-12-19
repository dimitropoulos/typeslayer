import {
  Alert,
  AlertTitle,
  Box,
  Button,
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
import { detectPlatformSlash } from "../../components/utils";
import { useToast } from "../../contexts/toast-context";
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
  return path?.split(detectPlatformSlash()).slice(-1)[0];
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

  console.log(selectedNode);

  const items = (
    <List>
      {hotSpots.map(({ path, duration }, index) => {
        const relativeTime = duration / firstHotSpot.duration;
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
                  label={`${duration.toLocaleString()}ms`}
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
  parentDuration,
  onSelect,
  depth = 0,
  parentStart,
}: {
  hotSpot: CircularHotSpot;
  parentDuration: number;
  parentStart: number;
  parentEnd: number;
  onSelect: (hotSpot: CircularHotSpot) => void;
  depth?: number;
}) => {
  const widthPercentage = (hotSpot.duration / parentDuration) * 100;
  const offsetPercentage =
    ((hotSpot.start - parentStart) / parentDuration) * 100;
  const hasChildren = hotSpot.children.length > 0;

  return (
    <Stack
      sx={{
        position: "absolute",
        left: `${offsetPercentage}%`,
        width: `${widthPercentage}%`,
      }}
    >
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
        {hotSpot.description}
      </Box>
      {hasChildren && (
        <Box
          sx={{
            width: "100%",
            position: "relative",
            mt: 0.5,
            minHeight: "24px",
          }}
        >
          {hotSpot.children.map((child: CircularHotSpot, index) => (
            <Span
              // biome-ignore lint/suspicious/noArrayIndexKey: fuck off bro
              key={index}
              hotSpot={child}
              parentDuration={hotSpot.duration}
              parentStart={hotSpot.start}
              parentEnd={hotSpot.end}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </Box>
      )}
    </Stack>
  );
};

const HotSpotItem = ({ hotSpot: rootHotSpot }: { hotSpot: HotSpot }) => {
  const { showToast } = useToast();
  const [selectedSpan, setSelectedSpan] = useState<CircularHotSpot | null>(
    null,
  );

  const displayedSpan = selectedSpan || (rootHotSpot as CircularHotSpot);
  const { path, duration, types } = displayedSpan;

  const onCopyPath = useCallback(() => {
    if (path) {
      navigator.clipboard.writeText(path).then(() => {
        showToast({
          message:
            "Path copied to clipboard.  Now search it in Perfetto to explore further.",
          severity: "success",
        });
      });
    }
  }, [path, showToast]);

  return (
    <Stack gap={3}>
      <Typography>
        👋 Hi. this section got a quite big overhaul recently to show a lot more
        information and be a lot more useful but it's not quite ready yet. in
        the meantime, what you can do is take the file paths here for these
        hotspots and search them in Perfetto. that'll give you all the same
        stuff that this will eventually become.
      </Typography>
      <Stack sx={{ gap: 1 }}>
        <Stack
          sx={{ flexDirection: "row", alignItems: "center", gap: 2, mb: 1 }}
        >
          <Typography variant="h5">{getFilename(path)}</Typography>
          <Button variant="outlined" size="small" onClick={onCopyPath}>
            Copy Path
          </Button>
        </Stack>

        {path ? <OpenablePath absolutePath={path} /> : null}
        {types && (
          <Typography variant="body2" color="text.secondary">
            Types: {types.join(", ")}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          Time: {duration}ms
        </Typography>
      </Stack>

      <Stack gap={1}>
        <Typography variant="h6">Execution Tree</Typography>
        <Box sx={{ position: "relative" }}>
          <Span
            hotSpot={rootHotSpot as CircularHotSpot}
            parentDuration={rootHotSpot.duration}
            parentStart={rootHotSpot.start}
            parentEnd={rootHotSpot.end}
            onSelect={setSelectedSpan}
          />
        </Box>
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
