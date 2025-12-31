import { Stack } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { BarChart, type BarProps } from "@mui/x-charts/BarChart";
import { useAnimateBar, useDrawingArea } from "@mui/x-charts/hooks";
import { panelBackground } from "@typeslayer/common";
import { detectPlatform } from "../../../components/platform-detection";
import { type Event, useEvents } from "../../../hooks";

// Helper function to adjust hex color lightness (positive percent lightens, negative darkens)
function hexLightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${((0x1000000 + R * 0x10000 + G * 0x100 + B) | 0).toString(16).slice(1)}`;
}

export function PlatformPercentages({
  eventName,
}: {
  eventName: Event["name"];
}) {
  const { data: rows } = useEvents(eventName);

  // Map to track OS -> color for each version
  const versionToColorMap = new Map<string, string>();

  // Group by OS and name/version, also tracking colors
  const groupedByOSAndVersion = rows?.reduce(
    (acc, { platform: rawPlatform }) => {
      const { operatingSystem, version, name, color } =
        detectPlatform(rawPlatform);
      const label = name || version; // Use name if available, otherwise version
      if (!acc[operatingSystem]) {
        acc[operatingSystem] = { data: {}, color };
      }
      if (!acc[operatingSystem].data[label]) {
        acc[operatingSystem].data[label] = 0;
      }
      acc[operatingSystem].data[label] += 1;
      // Track the color for each version/label
      versionToColorMap.set(label, color);
      return acc;
    },
    {} as Record<string, { data: Record<string, number>; color: string }>,
  );

  // Collect all unique versions across all OSes (filter out empty strings)
  const allVersions = new Set<string>();
  Object.values(groupedByOSAndVersion || {}).forEach(({ data: versions }) => {
    Object.keys(versions).forEach(v => {
      if (v) {
        allVersions.add(v);
      }
    });
  });

  const totalCount = rows?.length || 1;

  // Build dataset: one row per OS, columns for each version
  const dataset = Object.entries(groupedByOSAndVersion || {}).map(
    ([os, { data: versions }]) => {
      const row: Record<string, number | string> = { os };
      for (const version of allVersions) {
        row[version] = versions[version]
          ? (versions[version] / totalCount) * 100
          : 0;
      }
      return row;
    },
  );

  // Calculate OS totals and create map
  const osTotals = new Map<string, number>();
  dataset.forEach(row => {
    const total = Array.from(allVersions).reduce(
      (sum, v) => sum + (typeof row[v] === "number" ? row[v] : 0),
      0,
    );
    osTotals.set(row.os as string, total);
  });

  // Update dataset to include percentage in OS label
  dataset.forEach(row => {
    const os = row.os as string;
    const total = osTotals.get(os) || 0;
    row.os = `${os} (${Math.round(total)}%)`;
  });

  // Sort by total count per OS
  dataset.sort((a, b) => {
    const aOs = (a.os as string).split(" (")[0];
    const bOs = (b.os as string).split(" (")[0];
    const aTotal = osTotals.get(aOs) || 0;
    const bTotal = osTotals.get(bOs) || 0;
    return bTotal - aTotal;
  });

  // Calculate totals for each version across all OSes
  const versionTotals = new Map<string, number>();
  Array.from(allVersions).forEach(version => {
    const total = dataset.reduce((sum, row) => {
      return sum + (typeof row[version] === "number" ? row[version] : 0);
    }, 0);
    versionTotals.set(version, total);
  });

  // Create a series for each version with color
  const series = Array.from(allVersions)
    .filter(version => version) // Extra safety: filter empty versions
    .map(version => {
      const color = versionToColorMap.get(version) || "#999999";
      const total = versionTotals.get(version) || 0;
      return {
        id: version,
        dataKey: version,
        stack: "platform",
        label: `${version} (${Math.round(total)}%)`,
        color,
        valueFormatter: (value: number | null) =>
          value ? `${Math.round(value)}%` : "0%",
      };
    });

  const BarWithColor = (props: BarProps) => {
    const { color: barColor, id, ...other } = props;
    const theme = useTheme();

    const animatedProps = useAnimateBar(props);
    const { width } = useDrawingArea();

    const borderColor = hexLightness(barColor, -10);

    return (
      <>
        <rect
          {...other}
          fill={theme.palette.text.primary}
          opacity={0.05}
          stroke={theme.palette.text.primary}
          strokeWidth={4}
          x={other.x}
          width={width}
        />
        <rect
          {...other}
          fill={barColor}
          stroke={borderColor}
          strokeWidth={4}
          filter={
            props.ownerState?.isHighlighted ? "brightness(120%)" : undefined
          }
          opacity={props.ownerState?.isFaded ? 0.3 : 1}
          data-highlighted={props.ownerState?.isHighlighted || undefined}
          data-faded={props.ownerState?.isFaded || undefined}
          {...animatedProps}
        />
      </>
    );
  };

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
        sx={{
          "& .MuiBarElement-root": {
            paintOrder: "stroke",
          },
        }}
        xAxis={[
          {
            min: 0,
            max: 100,
            valueFormatter: (value: number) => `${value}%`,
          },
        ]}
        yAxis={[
          {
            scaleType: "band",
            dataKey: "os",
            width: 180,
          },
        ]}
        slotProps={{
          bar: {
            fillOpacity: 1,
          },
        }}
        slots={{
          bar: BarWithColor,
        }}
      />
    </Stack>
  );
}
