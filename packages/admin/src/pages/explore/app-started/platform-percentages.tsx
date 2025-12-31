import { Stack } from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import {
  BarChart,
  type BarLabelProps,
  type BarProps,
} from "@mui/x-charts/BarChart";
import { useAnimate, useAnimateBar, useDrawingArea } from "@mui/x-charts/hooks";
import { interpolateObject } from "@mui/x-charts-vendor/d3-interpolate";
import { panelBackground } from "@typeslayer/common";
import { detectPlatform } from "../../../components/platform-detection";
import { type Event, useEvents } from "../../../hooks";

export function PlatformPercentages({
  eventName,
}: {
  eventName: Event["name"];
}) {
  const { data: rows } = useEvents(eventName);

  // Group by OS and name/version
  const groupedByOSAndVersion = rows?.reduce(
    (acc, { platform: rawPlatform }) => {
      const { operatingSystem, version, name } = detectPlatform(rawPlatform);
      const label = name || version; // Use name if available, otherwise version
      if (!acc[operatingSystem]) {
        acc[operatingSystem] = {};
      }
      if (!acc[operatingSystem][label]) {
        acc[operatingSystem][label] = 0;
      }
      acc[operatingSystem][label] += 1;
      return acc;
    },
    {} as Record<string, Record<string, number>>,
  );

  // Collect all unique versions across all OSes (filter out empty strings)
  const allVersions = new Set<string>();
  Object.values(groupedByOSAndVersion || {}).forEach(versions => {
    Object.keys(versions).forEach(v => {
      if (v) {
        allVersions.add(v);
      }
    });
  });

  const totalCount = rows?.length || 1;

  // Build dataset: one row per OS, columns for each version
  const dataset = Object.entries(groupedByOSAndVersion || {}).map(
    ([os, versions]) => {
      const row: Record<string, number | string> = { os };
      for (const version of allVersions) {
        row[version] = versions[version]
          ? (versions[version] / totalCount) * 100
          : 0;
      }
      return row;
    },
  );

  // Sort by total count per OS
  dataset.sort((a, b) => {
    const aTotal = Array.from(allVersions).reduce(
      (sum, v) => sum + (typeof a[v] === "number" ? a[v] : 0),
      0,
    );
    const bTotal = Array.from(allVersions).reduce(
      (sum, v) => sum + (typeof b[v] === "number" ? b[v] : 0),
      0,
    );
    return bTotal - aTotal;
  });

  // Create a series for each version
  const series = Array.from(allVersions)
    .filter(version => version) // Extra safety: filter empty versions
    .map(version => ({
      id: version,
      dataKey: version,
      stack: "platform",
      label: version,
      valueFormatter: (value: number | null) =>
        value ? `${Math.round(value)}%` : "0%",
    }));

  return (
    <Stack
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        m: 2,
        p: 2,
        backgroundColor: panelBackground,
      }}
    >
      <Typography>Platform Percentages</Typography>
      <BarChart
        height={300}
        dataset={dataset}
        series={series}
        layout="horizontal"
        xAxis={[
          {
            min: 0,
            max: 100,
            valueFormatter: (value: number) => `${value}%`,
          },
        ]}
        barLabel={v =>
          v.value && v.value > 5 ? `${Math.round(v.value)}%` : ""
        }
        yAxis={[
          {
            scaleType: "band",
            dataKey: "os",
            width: 140,
          },
        ]}
        slots={{
          barLabel: BarLabelAtBase,
          bar: BarShadedBackground,
        }}
      />
    </Stack>
  );
}

export function BarShadedBackground(props: BarProps) {
  const {
    ownerState,
    skipAnimation,
    id,
    dataIndex,
    xOrigin,
    yOrigin,
    ...other
  } = props;
  const theme = useTheme();

  const animatedProps = useAnimateBar(props);
  const { width } = useDrawingArea();
  return (
    <>
      <rect
        {...other}
        fill={(theme.vars || theme).palette.text.primary}
        opacity={theme.palette.mode === "dark" ? 0.05 : 0.1}
        x={other.x}
        width={width}
      />
      <rect
        {...other}
        filter={ownerState.isHighlighted ? "brightness(120%)" : undefined}
        opacity={ownerState.isFaded ? 0.3 : 1}
        data-highlighted={ownerState.isHighlighted || undefined}
        data-faded={ownerState.isFaded || undefined}
        {...animatedProps}
      />
    </>
  );
}

const Text = styled("text")(({ theme }) => ({
  ...theme?.typography?.body2,
  stroke: "none",
  fill: (theme.vars || theme).palette.common.white,
  transition: "opacity 0.2s ease-in, fill 0.2s ease-in",
  textAnchor: "start",
  dominantBaseline: "central",
  pointerEvents: "none",
  fontWeight: 600,
}));

function BarLabelAtBase(props: BarLabelProps) {
  const {
    seriesId,
    dataIndex,
    color,
    isFaded,
    isHighlighted,
    classes,
    xOrigin,
    yOrigin,
    x,
    y,
    width,
    height,
    layout,
    skipAnimation,
    ...otherProps
  } = props;

  const animatedProps = useAnimate(
    { x: xOrigin + 8, y: y + height / 2 },
    {
      initialProps: { x: xOrigin, y: y + height / 2 },
      createInterpolator: interpolateObject,
      transformProps: p => p,
      applyProps: (element: SVGTextElement, p) => {
        element.setAttribute("x", p.x.toString());
        element.setAttribute("y", p.y.toString());
      },
      skip: skipAnimation,
    },
  );

  return <Text {...otherProps} {...animatedProps} />;
}
