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
import { useQuery } from "@tanstack/react-query";
import type { AbsolutePath } from "@typeslayer/analyze-trace/src/utils";
import {
	extractPackageName,
	type ResolvedType,
	relativizePath,
} from "@typeslayer/validate";
import type { JSX } from "react";

export const friendlyPath = (
	absolutePath: string | undefined,
	projectRoot: string | undefined,
	simplifyPath: boolean,
) => {
	if (!absolutePath) {
		console.error("missing path", {
			fullPath: absolutePath,
			projectRoot,
			simplifyPath,
		});
		return "[Missing Path]";
	}

	if (!simplifyPath || !projectRoot) {
		return absolutePath;
	}
	if (absolutePath.startsWith(projectRoot)) {
		// remove the project root from the path
		return absolutePath.slice(projectRoot.length);
	}

	const packageName = extractPackageName(absolutePath);
	if (packageName && packageName !== absolutePath) {
		const splitVersionIndex = packageName.indexOf(
			"@",
			packageName.startsWith("@") ? 1 : 0,
		);
		if (splitVersionIndex === -1) {
			// no version found, just return the package name
			return packageName;
		}

		const withoutVersion = packageName.slice(0, splitVersionIndex);

		const locationOfWithoutVersion = absolutePath.lastIndexOf(withoutVersion);
		if (locationOfWithoutVersion === -1) {
			// the package name without version is not found in the absolute path
			return packageName;
		}
		const pathAfterPackageName = absolutePath.slice(
			locationOfWithoutVersion + withoutVersion.length,
		);
		return `${packageName}${pathAfterPackageName}`;
	}

	return relativizePath(projectRoot, absolutePath);
};

export const serverBaseUrl = "http://127.0.0.1:4765";

export const useStaticFile = (fileName: string) => {
	return useQuery<string>({
		queryKey: ["outputs", fileName],
		queryFn: async () => {
			const response = await fetch(`${serverBaseUrl}/outputs/${fileName}`);
			if (!response.ok) {
				throw new Error(
					`Failed to fetch ${fileName}: ${response.statusText}`,
				);
			}
			return response.text();
		},
		staleTime: Number.POSITIVE_INFINITY,
	});
};

export type HeaderNavigationItem = {
	kind: "header";
	title: string;
};

export type SegmentNavigationItem = {
	kind: "segment";
	segment: string;
	title: string;
	icon: JSX.Element;
};

export type DividerNavigationItem = {
	kind: "divider";
};

export type NavigationItem =
	| HeaderNavigationItem
	| SegmentNavigationItem
	| DividerNavigationItem;

export const NAVIGATION = [
	{
		kind: "segment",
		segment: "start/select-code",
		title: "Start",
		icon: <PlayCircle />,
	},
	{
		kind: "segment",
		segment: "search-types",
		title: "Search Types",
		icon: <Search />,
	},
	{
		kind: "segment",
		segment: "award-winners/largest-union",
		title: "Award Winners",
		icon: <EmojiEvents />,
	},
	{
		kind: "segment",
		segment: "type-network",
		title: "Type Network",
		icon: <Hub />,
	},
	{
		kind: "segment",
		segment: "treemap",
		title: "Treemap",
		icon: <Dashboard />,
	},
	{
		kind: "segment",
		segment: "perfetto",
		title: "Perfetto",
		icon: <Speed />,
	},
	{
		kind: "segment",
		segment: "speedscope",
		title: "SpeedScope",
		icon: <Biotech />,
	},
	{
		kind: "segment",
		segment: "raw-data/types-json",
		title: "Raw Data",
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
		kind: "segment",
		segment: "integrations",
		title: "Integrations",
		icon: <Layers />,
	},
	{
		kind: "segment",
		segment: "settings",
		title: "Settings",
		icon: <Settings />,
	},
] as const satisfies NavigationItem[];

export const extractPath = (resolvedType: ResolvedType) => {
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

export const friendlyPackageName = (
	absolutePath: AbsolutePath,
	projectRoot: string | undefined,
	simplifyPaths: boolean,
) => {
	const extracted = extractPackageName(absolutePath);
	if (extracted !== absolutePath) {
		// we were able to extract a package name
		return extracted;
	}

	if (!simplifyPaths) {
		return absolutePath;
	}

	return friendlyPath(absolutePath, projectRoot, simplifyPaths);
};
