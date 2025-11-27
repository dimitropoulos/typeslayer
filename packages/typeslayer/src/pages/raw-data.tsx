import { Description } from "@mui/icons-material";
import {
	Box,
	Button,
	Divider,
	List,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	Stack,
	Typography,
} from "@mui/material";
import { useNavigate, useParams } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { ANALYZE_TRACE_FILENAME } from "@typeslayer/analyze-trace/src/constants";
import {
	CPU_PROFILE_FILENAME,
	TRACE_JSON_FILENAME,
	TYPES_JSON_FILENAME,
} from "@typeslayer/validate";
import { useEffect, useMemo, useState } from "react";

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

			<Box sx={{ flexGrow: 1, p: 3, overflow: "auto" }}>
				<RawDataPane key={currentKey} itemKey={currentKey} />
			</Box>
		</Stack>
	);
};

const RawDataPane = ({ itemKey }: { itemKey: RawKey }) => {
	const item = RAW_ITEMS[itemKey];
	const [text, setText] = useState<string>("");
	const [verifyStatus, setVerifyStatus] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const resp = await fetch(`/static/${item.filename}`);
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
			setVerifyStatus("Copied to clipboard");
			setTimeout(() => setVerifyStatus(null), 2000);
		} catch {
			setVerifyStatus("Copy failed");
		}
	};

	const onDownload = () => {
		const a = document.createElement("a");
		a.href = `/static/${item.filename}`;
		a.download = item.filename;
		a.click();
	};

	const onVerify = async () => {
		try {
			await invoke(item.verifyInvoke);
			setVerifyStatus("Verified: OK");
		} catch (_e) {
			setVerifyStatus(`Verify failed`);
		}
		setTimeout(() => setVerifyStatus(null), 4000);
	};

	return (
		<Stack gap={2}>
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

			{verifyStatus && (
				<Typography variant="body2" color="text.secondary">
					{verifyStatus}
				</Typography>
			)}

			<Box
				component="pre"
				sx={{
					p: 2,
					bgcolor: (t) => t.palette.background.default,
					borderRadius: 1,
					overflowX: "auto",
				}}
			>
				{text}
			</Box>
		</Stack>
	);
};
