import {
	Biotech,
	CameraAlt,
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
import { IconButton, Snackbar } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import {
	extractPackageName,
	type ResolvedType,
	relativizePath,
} from "@typeslayer/validate";
import { type FC, type JSX, useState } from "react";
import dimitropoulosAvatar from "../assets/dimitropoulos.png";

const ScreenshotAction: FC<{ collapsed: boolean }> = ({ collapsed }) => {
	const [screenshotSnackbar, setScreenshotSnackbar] = useState<{
		open: boolean;
		message: string;
	}>({ open: false, message: "" });

	const handleScreenshot = async () => {
		try {
			const savedPath = await invoke<string>("take_screenshot");
			setScreenshotSnackbar({
				open: true,
				message: savedPath
					? `Screenshot saved to ${savedPath} and copied to clipboard`
					: "Screenshot captured",
			});
		} catch (error) {
			setScreenshotSnackbar({
				open: true,
				message: `Unable to capture screenshot: ${String(error)}`,
			});
		}
	};
	return (
		<>
			<IconButton
				onClick={handleScreenshot}
				size="small"
				aria-label="Take screenshot"
				sx={{
					width: "100%",
					flexGrow: 1,
					height: 40,
					display: "flex",
					gap: 1,
					mb: 0.5,
					borderRadius: 0,
					bgcolor: (t) => t.palette.background.paper,
					border: (t) => `1px solid ${t.palette.divider}`,
					"&:hover": {
						bgcolor: (t) => t.palette.action.hover,
					},
				}}
			>
				<CameraAlt fontSize="small" />
				{!collapsed && <span style={{ fontSize: 14 }}>Screenshot</span>}
			</IconButton>
			<Snackbar
				open={screenshotSnackbar.open}
				autoHideDuration={4000}
				onClose={() => setScreenshotSnackbar({ open: false, message: "" })}
				message={screenshotSnackbar.message}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			/>
		</>
	);
};

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
				throw new Error(`Failed to fetch ${fileName}: ${response.statusText}`);
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

export type ExpanderNavigationItem = {
	kind: "expander";
};

export type ActionNavigationItem = {
	kind: "action";
	action: FC<{ collapsed: boolean }>;
};

export type NavigationItem =
	| HeaderNavigationItem
	| SegmentNavigationItem
	| DividerNavigationItem
	| ExpanderNavigationItem
	| ActionNavigationItem;

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
		segment: "raw-data/analyze-trace",
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
	{
		kind: "expander",
	},
	{
		kind: "action",
		action: ScreenshotAction,
	},
	{
		kind: "divider",
	},
	{
		kind: "segment",
		segment: "about",
		title: "by dimitropoulos",
		icon: (
			<img
				src={dimitropoulosAvatar}
				alt="dimitropoulos avatar"
				style={{ width: 20, height: 20, borderRadius: "50%" }}
			/>
		),
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
