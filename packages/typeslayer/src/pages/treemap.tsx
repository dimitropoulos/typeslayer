import { Box, CircularProgress, Snackbar, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { useState } from "react";
import { friendlyPath } from "../components/utils";
import { useProjectRoot, useSimplifyPaths } from "../hooks/tauri-hooks";

interface TreemapNode {
	name: string;
	value: number;
	path?: string;
	children?: TreemapNode[];
}

export const Treemap = () => {
	const simplifyPaths = useSimplifyPaths();
	const projectRoot = useProjectRoot();
	const [snackbarOpen, setSnackbarOpen] = useState(false);

	const { data, isLoading, error } = useQuery<TreemapNode[]>({
		queryKey: ["treemap_data"],
		queryFn: async () => invoke<TreemapNode[]>("get_treemap_data"),
		staleTime: Number.POSITIVE_INFINITY,
	});

	if (isLoading || simplifyPaths.isLoading || projectRoot.isLoading) {
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

	const simplifyPathsValue = simplifyPaths.data ?? false;
	const projectRootValue = projectRoot.data;

	const formatPath = (path: string | undefined) => {
		if (!path) return "";
		// Don't try to format the series name or non-path strings
		if (path === "TypeScript Compilation" || !path.includes("/")) {
			return path;
		}
		return friendlyPath(path, projectRootValue, simplifyPathsValue);
	};

	const option: EChartsOption = {
		backgroundColor: "#000000",
		tooltip: {
			formatter: (params) => {
				if (Array.isArray(params)) return "";
				const info = params as {
					data?: TreemapNode;
					name?: string;
					value?: number | number[];
				};
				const path = formatPath(info.data?.path || info.name || "");
				const valueMs =
					typeof info.value === "number"
						? (info.value / 1000)
								.toFixed(2)
								.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
						: "0";
				return `<div style="padding: 8px;">
					<strong>${info.name}</strong><br/>
					<span style="color: #000000;">${path}</span><br/>
					<span>${valueMs} ms</span>
				</div>`;
			},
		},
		visualMap: {
			show: false,
			min: 0,
			max: Math.max(...data.map((f) => f.value)),
			inRange: {
				colorAlpha: [0.1, 0.6],
			},
			seriesIndex: 0,
		},
		series: [
			{
				type: "treemap",
				breadcrumb: {
					show: false,
				},
				roam: true,
				nodeClick: false,
				label: {
					show: true,
					formatter: "{b}",
					color: "#fff",
					fontSize: 13,
				},
				itemStyle: {
					borderColor: "#000000",
					borderWidth: 2,
					color: "#C02929",
				},
				levels: [
					{},
					{
						itemStyle: {
							color: "#C02929",
						},
					},
				],
				data,
			},
		],
	};
	const handleClick = async (params: {
		data?: TreemapNode;
		event?: { stop: () => void };
	}) => {
		// Stop event propagation to prevent multiple clicks
		if (params.event) {
			params.event.stop();
		}
		const path = params.data?.path;
		if (path) {
			await navigator.clipboard.writeText(path);
			setSnackbarOpen(true);
		}
	};

	return (
		<Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
			<Box sx={{ py: 2, px: 4 }}>
				<Typography variant="h4">TypeScript Compilation Treemap</Typography>
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
			<Snackbar
				open={snackbarOpen}
				autoHideDuration={4000}
				onClose={() => setSnackbarOpen(false)}
				message="Copied file path to clipboard, paste it into perfetto to learn more"
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			/>
		</Box>
	);
};
