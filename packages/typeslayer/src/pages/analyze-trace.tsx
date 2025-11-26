import { Button, Stack, Typography } from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { ShowFile } from "../components/show-file";

export const AnalyzeTrace = () => {
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const runAnalyze = async () => {
		setRunning(true);
		setError(null);
		try {
			await invoke("analyze_trace_command", { options: null });
		} catch (e) {
			console.error(e);
			setError(String(e));
		} finally {
			setRunning(false);
		}
	};

	return (
		<Stack gap={2} sx={{ mx: 4 }}>
			<h1>Analyze Trace</h1>
			<Typography variant="body1">
				Generate and view hotspots and duplicate packages from the trace.
			</Typography>
			<Stack direction="row" gap={2}>
				<Button variant="contained" disabled={running} onClick={runAnalyze}>
					{running ? "Analyzing…" : "Run Analysis"}
				</Button>
				{error && <Typography color="error">{error}</Typography>}
			</Stack>
			<ShowFile
				fileName="analyze-trace.json"
				title="analyze-trace.json"
				description="This is the raw output from the built-in analyzer (hotspots, duplicate packages)."
			/>
		</Stack>
	);
};
