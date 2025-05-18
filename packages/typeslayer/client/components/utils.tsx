import {
	Biotech,
	Dashboard,
	Description,
	Layers,
	PlayCircle,
	Search,
	Settings,
	Speed,
} from "@mui/icons-material";
import type { Navigation } from "@toolpad/core/AppProvider";
import { useEffect, useState } from "react";

export const displayPath = (
	fullPath: string | undefined,
	cwd: string | undefined,
	simplifyPath: boolean,
) => {
	if (!fullPath) {
		console.error("missing path", { fullPath, cwd, simplifyPath });
		return "[Missing Path]";
	}

	if (!simplifyPath || !cwd) {
		return fullPath;
	}
	return fullPath.replace(cwd, ".");
};

export const useStaticFile = (fileName: string) => {
	const [data, setData] = useState<string | null>(null);
	useEffect(() => {
		const fetchData = async () => {
			try {
				const response = await fetch(
					`http://localhost:3000/static/${fileName}`,
				);
				if (!response.ok) {
					throw new Error("Network response was not ok");
				}
				const text = await response.text();
				setData(text);
			} catch (error) {
				console.error("Error fetching data:", error);
			}
		};
		fetchData();
	});
	return data;
};

export const NAVIGATION = [
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
		icon: <Dashboard />,
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
		icon: <Description />,
	},
	{
		segment: "trace-json",
		title: "trace.json",
		icon: <Description />,
	},
	{
		segment: "types-json",
		title: "types.json",
		icon: <Description />,
	},
	{
		segment: "tsc-cpuprofile",
		title: "tsc.cpuprofile",
		icon: <Description />,
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
		icon: <Layers />,
	},
	{
		segment: "settings",
		title: "Settings",
		icon: <Settings />,
	},
] as const;
