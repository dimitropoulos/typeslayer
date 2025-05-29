import {
	Biotech,
	Dashboard,
	Description,
	EmojiEvents,
	Hub,
	Layers,
	PlayCircle,
	Search,
	Settings,
	Speed,
} from "@mui/icons-material";
import type { NavigationItem } from "@toolpad/core";
import { ANALYZE_TRACE_FILENAME } from "@typeslayer/analyze-trace/src/constants";
import {
	CPU_PROFILE_FILENAME,
	type ResolvedType,
	TRACE_JSON_FILENAME,
	TYPES_JSON_FILENAME,
} from "@typeslayer/validate";
import { useEffect, useState } from "react";

export const displayPath = (
	fullPath: string | undefined,
	projectRoot: string | undefined,
	simplifyPath: boolean,
) => {
	if (!fullPath) {
		console.error("missing path", { fullPath, projectRoot, simplifyPath });
		return "[Missing Path]";
	}

	if (!simplifyPath || !projectRoot) {
		return fullPath;
	}
	return fullPath.replace(projectRoot, "");
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
		segment: "search-types",
		title: "Search Type Id",
		icon: <Search />,
	},
	{
		segment: "award-winners",
		title: "Award Winners",
		icon: <EmojiEvents />,
	},
	{
		segment: "type-network",
		title: "Type Network",
		icon: <Hub />,
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
		kind: "divider",
	},
	{
		kind: "header",
		title: "Raw Data",
	},
	{
		segment: "analyze-trace",
		title: ANALYZE_TRACE_FILENAME,
		icon: <Description />,
	},
	{
		segment: "trace-json",
		title: TRACE_JSON_FILENAME,
		icon: <Description />,
	},
	{
		segment: "types-json",
		title: TYPES_JSON_FILENAME,
		icon: <Description />,
	},
	{
		segment: "tsc-cpuprofile",
		title: CPU_PROFILE_FILENAME,
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
] as const satisfies NavigationItem[];

const extractPath = (resolvedType: ResolvedType) => {
	if (resolvedType.firstDeclaration?.path) {
		return resolvedType.firstDeclaration.path;
	}
	if (resolvedType.referenceLocation?.path) {
		return resolvedType.referenceLocation.path;
	}
	if (resolvedType.destructuringPattern?.path) {
		return resolvedType.destructuringPattern.path;
	}
	return undefined;
};
