import { LocalFireDepartment } from "@mui/icons-material";
import { Stack } from "@mui/material";
import Typography from "@mui/material/Typography";
import { AppProvider } from "@toolpad/core/AppProvider";
import { DashboardLayout } from "@toolpad/core/DashboardLayout";
import { useDemoRouter } from "@toolpad/core/internal";
import { NAVIGATION } from "./components/utils";
import { AnalyzeTrace } from "./pages/analyze-trace";
import { CpuProfile } from "./pages/cpu-profile";
import { Generate } from "./pages/generate";
import { Heatmap } from "./pages/heatmap";
import { Perfetto } from "./pages/perfetto";
import { SearchTypes } from "./pages/search-types";
import { SpeedScope } from "./pages/speedscope";
import { TraceJson } from "./pages/trace-json";
import { TypesJson } from "./pages/types-json";
import { theme } from "./theme";

function DemoPageContent({ pathname }: { pathname: string }) {
	switch (pathname) {
		case "/generate":
			return <Generate />;
		case "/heatmap":
			return <Heatmap />;
		case "/perfetto":
			return <Perfetto />;
		case "/analyze-trace":
			return <AnalyzeTrace />;
		case "/trace-json":
			return <TraceJson />;
		case "/types-json":
			return <TypesJson />;
		case "/tsc-cpuprofile":
			return <CpuProfile />;
		case "/speedscope":
			return <SpeedScope />;
		case "/search-types":
			return <SearchTypes />;
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
