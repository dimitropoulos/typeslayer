import { Info } from "@mui/icons-material";
import {
  Box,
  CircularProgress,
  IconButton,
  Popover,
  Stack,
  Typography,
} from "@mui/material";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { useCallback, useMemo, useState } from "react";
import { StatPill } from "../components/stat-pill";
import { friendlyPath } from "../components/utils";
import { useToast } from "../contexts/toast-context";
import {
  type TreemapNode,
  useProjectRoot,
  useRelativePaths,
  useTreemap,
} from "../hooks/tauri-hooks";

export const Treemap = () => {
  const relativePaths = useRelativePaths();
  const projectRoot = useProjectRoot();
  const { showToast } = useToast();
  const [_popoverOpen, _setPopoverOpen] = useState(false);
  const [popoverAnchorEl, setPopoverAnchorEl] =
    useState<HTMLButtonElement | null>(null);

  const { data, isLoading, error } = useTreemap();

  const totalTime = useMemo(() => {
    if (!data) {
      return 0;
    }
    return data.reduce((acc, node) => acc + node.value, 0);
  }, [data]);

  const formatPath = useCallback(
    (path: string | undefined) => {
      if (!path) {
        return "";
      }
      // Don't try to format the series name or non-path strings
      if (path === "TypeScript Compilation" || !path.includes("/")) {
        return path;
      }
      return friendlyPath(path, projectRoot.data, relativePaths.data);
    },
    [projectRoot.data, relativePaths.data],
  );

  const handleClick = useCallback(
    async (params: { data?: TreemapNode; event?: { stop: () => void } }) => {
      // Stop event propagation to prevent multiple clicks
      if (params.event) {
        params.event.stop();
      }
      const path = params.data?.path;
      if (path) {
        await navigator.clipboard.writeText(path);
        showToast({
          message:
            "Copied file path to clipboard.\n\nPaste it into Perfetto to learn more.",
          severity: "success",
          duration: 4000,
        });
      }
    },
    [showToast],
  );

  if (isLoading || relativePaths.isLoading || projectRoot.isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mx: 4, mt: 4 }}>
        <Typography variant="h4" color="error">
          Error Loading Treemap
        </Typography>
        <Typography>{String(error)}</Typography>
      </Box>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Box sx={{ mx: 4, mt: 4 }}>
        <Typography variant="h4">Treemap</Typography>
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          No trace data available. Please generate a trace.json file first.
        </Typography>
      </Box>
    );
  }
  const gridSpacing = 20;

  const option: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: {
      formatter: params => {
        if (Array.isArray(params)) {
          return "";
        }
        const info = params as {
          data?: TreemapNode;
          name?: string;
          value?: number | number[];
        };
        const path = formatPath(info.data?.path || info.name || "");
        const valueMs =
          typeof info.value === "number"
            ? (info.value / 1000).toLocaleString()
            : "0";
        return `
          <div style="padding: 8px;">
            <strong>${info.name}</strong><br/>
            <span style="color: #000000;">${path}</span><br/>
            <span>${valueMs} ms</span><br/>
            <span>${(((info.value as number) / totalTime) * 100).toFixed(2)}% of the total time</span>
          </div>
        `;
      },
    },
    visualMap: {
      show: false,
      min: 0,
      max: Math.max(...data.map(f => f.value)),
      inRange: {
        colorLightness: [0, 0],
        colorAlpha: [0.8, 0],
      },
      seriesIndex: 0,
      padding: 0,
    },
    series: [
      {
        type: "treemap",
        top: gridSpacing,
        bottom: gridSpacing,
        left: gridSpacing,
        right: gridSpacing,
        breadcrumb: {
          show: false,
        },
        roam: true,
        nodeClick: false,
        label: {
          show: true,
          formatter: "{b}",
          color: "#fff",
          fontSize: 14,
        },
        itemStyle: {
          borderColor: "#000000",
          borderWidth: 2,
          color: "#C02929",
          gapWidth: 3,
        },
        levels: [
          {},
          {
            itemStyle: {
              color: "#C02929",
              borderColorSaturation: 0.4,
              borderWidth: 1,
            },
          },
        ],
        data,
      },
    ],
  };

  const open = Boolean(popoverAnchorEl);
  const id = open ? "simple-popover" : undefined;

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Box sx={{ p: 1, mt: 3, mx: 2 }}>
        <Stack direction="row" spacing={1}>
          <Typography variant="h2">Compilation Time Treemap</Typography>
          <Popover
            id={id}
            open={open}
            anchorEl={popoverAnchorEl}
            onClose={() => setPopoverAnchorEl(null)}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "left",
            }}
          >
            <Box sx={{ fontSize: 16, p: 1, maxWidth: 400 }}>
              just because a certain file takes longer to compile doesn't
              necessarily mean it's the root cause of slow compilation times.
              <br />
              <br />
              very often, the problematic type is deeper, and this file is just
              the starting point...but at least this gives you <em>some</em>{" "}
              specific place to start.
              <br />
              <br />
              click on a rectangle of interest to get the path. then take that
              path into perfetto and see if you can glean more information about
              what's below.
            </Box>
          </Popover>
          <IconButton
            aria-describedby={id}
            size="large"
            onClick={event => {
              setPopoverAnchorEl(event.currentTarget);
            }}
          >
            <Info />
          </IconButton>
          <span style={{ flexGrow: 1 }}></span>
          {totalTime > 0 ? (
            <StatPill
              label="milliseconds"
              value={Math.round(totalTime / 1000)}
            />
          ) : null}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          File compilation times visualized by directory and duration
          (milliseconds)
        </Typography>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ReactECharts
          option={option}
          style={{ height: "100%", width: "100%" }}
          opts={{ renderer: "svg" }}
          onEvents={{ click: handleClick }}
        />
      </Box>
    </Box>
  );
};
