import Typography from "@mui/material/Typography";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DescriptionIcon from "@mui/icons-material/Description";
import LayersIcon from "@mui/icons-material/Layers";
import { AppProvider, type Navigation } from "@toolpad/core/AppProvider";
import { DashboardLayout } from "@toolpad/core/DashboardLayout";
import { useDemoRouter } from "@toolpad/core/internal";
import { theme } from "./theme";
import { Stack } from "@mui/material";
import { Biotech, LocalFireDepartment, PlayCircle, Search, Settings, Speed } from "@mui/icons-material";
import { Generate } from "./pages/generate";
import { Heatmap } from "./pages/heatmap";
import { AnalyzeTrace } from "./pages/analyze-trace";
import { TraceJson } from "./pages/trace-json";
import { TypesJson } from "./pages/types-json";
import { Perfetto } from "./pages/perfetto";
import { SearchTypes } from "./pages/search-types";
import { CpuProfile } from "./pages/cpu-profile";
import { SpeedScope } from "./pages/speedscope";

const NAVIGATION: Navigation = [
  {
    kind: "header",
    title: "Explore",
  },
  {
    segment: "generate",
    title: "Generate",
    icon: <PlayCircle />,
  },
  {
    segment: "heatmap",
    title: "Heatmap",
    icon: <DashboardIcon />,
  },
  {
    segment: "perfetto",
    title: "Perfetto",
    icon: <Speed />,
  },
  {
    segment: "speedscope",
    title: "SpeedScope",
    icon: <Biotech />,
  },
  {
    segment: "search-types",
    title: "Search Types",
    icon: <Search />,
  },
  {
    kind: "divider",
  },
  {
    kind: "header",
    title: "Raw Data",
  },
  {
    segment: "analyze-trace",
    title: "Analyze Trace",
    icon: <DescriptionIcon />,
  },
  {
    segment: "trace-json",
    title: "trace.json",
    icon: <DescriptionIcon />,
  },
  {
    segment: "types-json",
    title: "types.json",
    icon: <DescriptionIcon />,
  },
  {
    segment: "tsc-cpuprofile",
    title: "tsc.cpuprofile",
    icon: <DescriptionIcon />,
  },
  {
    kind: "divider",
  },
  {
    kind: "header",
    title: "Configuration",
  },
  {
    segment: "integrations",
    title: "Integrations",
    icon: <LayersIcon />,
  },
  {
    segment: "settings",
    title: "Settings",
    icon: <Settings />,
  },
];

function DemoPageContent({ pathname }: { pathname: string }) {
  switch (pathname) {
    case "/generate":
      return <Generate />
    case "/heatmap":
      return <Heatmap />
    case "/perfetto":
      return <Perfetto />
    case "/analyze-trace":
      return <AnalyzeTrace />
    case "/trace-json":
      return <TraceJson />
    case "/types-json":
      return <TypesJson />
    case "/tsc-cpuprofile":
      return <CpuProfile />
    case "/speedscope":
      return <SpeedScope />
    case "/search-types":
      return <SearchTypes />
    default:
      return <div>Page Not Found</div>;
  }
}

function appTitle() {
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <LocalFireDepartment />
      <Typography variant="h6">TypeSlayer</Typography>
    </Stack>
  );
}

export function App() {
  const router = useDemoRouter("/generate");
  return (
    <AppProvider navigation={NAVIGATION} router={router} theme={theme}>
      <DashboardLayout
        slots={{
          appTitle,
        }}
      >
        <DemoPageContent pathname={router.pathname} />
      </DashboardLayout>
    </AppProvider>
  );
}
