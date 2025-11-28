import { Description } from "@mui/icons-material";
import {
	Alert,
	Box,
	Button,
	Divider,
	List,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	Snackbar,
	Stack,
	Typography,
} from "@mui/material";
import { useNavigate, useParams } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { downloadDir } from "@tauri-apps/api/path";
import { download } from "@tauri-apps/plugin-upload";
import { ANALYZE_TRACE_FILENAME } from "@typeslayer/analyze-trace/src/constants";
import {
	CPU_PROFILE_FILENAME,
	TRACE_JSON_FILENAME,
	TYPES_JSON_FILENAME,
} from "@typeslayer/validate";
import { useCallback, useEffect, useMemo, useState } from "react";
import { serverBaseUrl } from "../components/utils";

type RawKey = "analyze" | "trace" | "types" | "cpu";

const RAW_ITEMS: Record<
	RawKey,
	{
		title: string;
		route: string;
		filename: string;
		description: string;
		verifyInvoke: string;
		fetchInvoke: string;
	}
> = {
	trace: {
		title: TRACE_JSON_FILENAME,
		route: "trace-json",
		filename: TRACE_JSON_FILENAME,
		description:
			"Raw event trace emitted by the TypeScript compiler during type checking.",
		verifyInvoke: "validate_trace_json",
		fetchInvoke: "get_trace_json_text",
	},
	types: {
		title: TYPES_JSON_FILENAME,
		route: "types-json",
		filename: TYPES_JSON_FILENAME,
		description: "Resolved types catalog containing metadata for each type id.",
		verifyInvoke: "validate_types_json",
		fetchInvoke: "get_types_json_text",
	},
	analyze: {
		title: ANALYZE_TRACE_FILENAME,
		route: "analyze-trace",
		filename: ANALYZE_TRACE_FILENAME,
		description:
			"Summary insights extracted from trace.json, including hotspots and duplicate packages.",
		verifyInvoke: "verify_analyze_trace",
		fetchInvoke: "get_analyze_trace_text",
	},
	cpu: {
		title: CPU_PROFILE_FILENAME,
		route: "tsc-cpuprofile",
		filename: CPU_PROFILE_FILENAME,
		description:
			"V8 CPU profile generated during the TypeScript compilation run.",
		verifyInvoke: "verify_cpu_profile",
		fetchInvoke: "get_cpu_profile_text",
	},
};

export const RawData = () => {
	const params = useParams({ strict: false });
	const navigate = useNavigate();
	const child = (params.fileId as string | undefined) ?? "types-json";

	const currentKey: RawKey = useMemo(() => {
		const entry = Object.entries(RAW_ITEMS).find(([, v]) => v.route === child);
		return (entry?.[0] as RawKey) ?? "types";
	}, [child]);

	const setActive = (key: RawKey) => {
		navigate({ to: `/raw-data/${RAW_ITEMS[key].route}` });
	};

	return (
		<Stack direction="row" sx={{ height: "100%" }}>
			<Stack sx={{ px: 1 }}>
				<List sx={{ width: 220 }}>
					{(Object.keys(RAW_ITEMS) as RawKey[]).map((key) => (
						<ListItemButton
							key={key}
							selected={key === currentKey}
							onClick={() => setActive(key)}
						>
							<ListItemIcon sx={{ minWidth: 38 }}>
								<Description />
							</ListItemIcon>
							<ListItemText primary={RAW_ITEMS[key].title} />
						</ListItemButton>
					))}
				</List>
			</Stack>

			<Divider orientation="vertical" />

			<RawDataPane key={currentKey} itemKey={currentKey} />
		</Stack>
	);
};

const RawDataPane = ({ itemKey }: { itemKey: RawKey }) => {
	const item = RAW_ITEMS[itemKey];
	const [text, setText] = useState<string>("");
	const [toast, setToast] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
		path?: string;
	}>({ open: false, message: "", severity: "success" });

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const url = `${serverBaseUrl}/outputs/${item.filename}`;
				const resp = await fetch(url);
				const content = await resp.text();
				if (mounted) setText(content);
			} catch {
				console.error("Failed to fetch file contents");
			}
		})();
		return () => {
			mounted = false;
		};
	}, [item.filename]);

	const onCopy = async () => {
		try {
			await navigator.clipboard.writeText(text);
			setToast({
				open: true,
				message: "Copied to clipboard",
				severity: "success",
			});
		} catch {
			setToast({ open: true, message: "Copy failed", severity: "error" });
		}
	};

	const onDownload = useCallback(async () => {
		try {
			const base = await downloadDir();
			const dest = `${base}${base.endsWith("/") ? "" : "/"}${item.filename}`;
			const url = `${serverBaseUrl}/outputs/${item.filename}`;
			await download(url, dest);
			setToast({
				open: true,
				message: `Downloaded to: ${dest}`,
				severity: "success",
				path: dest,
			});
		} catch {
			setToast({ open: true, message: `Download failed`, severity: "error" });
		}
	}, [item.filename]);

	const onToastClick = useCallback(async () => {
		if (!toast.path) return;
		try {
			await invoke("open_file", { path: toast.path });
		} catch {
			setToast({ open: true, message: "Open failed", severity: "error" });
		}
	}, [toast.path]);

	const onVerify = async () => {
		try {
			await invoke(item.verifyInvoke);
			setToast({ open: true, message: "Verified: OK", severity: "success" });
		} catch (_e) {
			setToast({ open: true, message: "Verify failed", severity: "error" });
		}
	};

	return (
		<Stack
			sx={{
				gap: 2,
				flexGrow: 1,
				p: 3,
				overflow: "auto",
			}}
		>
			<Stack gap={1}>
				<Typography variant="h4">{item.title}</Typography>
				<Typography variant="body2" color="text.secondary">
					{item.description}
				</Typography>
			</Stack>

			<Stack direction="row" gap={2}>
				<Button variant="contained" onClick={onVerify}>
					Verify
				</Button>
				<Button variant="outlined" onClick={onCopy}>
					Copy
				</Button>
				<Button variant="outlined" onClick={onDownload}>
					Download
				</Button>
			</Stack>

			<Box
				component="pre"
				sx={{
					p: 2,
					bgcolor: (t) => t.palette.background.default,
					borderRadius: 1,
					overflow: "auto",
					fontFamily: "monospace",
					whiteSpace: "pre",
				}}
			>
				{text}
			</Box>
			<Snackbar
				anchorOrigin={{ vertical: "top", horizontal: "right" }}
				open={toast.open}
				onClose={() => setToast((t) => ({ ...t, open: false }))}
				autoHideDuration={5000}
			>
				<Alert
					variant="filled"
					severity={toast.severity}
					onClick={onToastClick}
					sx={{ cursor: toast.path ? "pointer" : "default" }}
				>
					{toast.message}
					{toast.path && (
						<Typography
							component="span"
							sx={{ ml: 1, textDecoration: "underline" }}
						>
							Open
						</Typography>
					)}
				</Alert>
			</Snackbar>
		</Stack>
	);
};
