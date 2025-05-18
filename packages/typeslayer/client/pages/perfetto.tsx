import { Speed } from "@mui/icons-material";
import { Button, Stack, Typography } from "@mui/material";
import { useCallback } from "react";
import { useStaticFile } from "../components/utils";

export const Perfetto = () => {
	const data = useStaticFile("trace.json");
	const launchPerfetto = useCallback(() => {
		if (!data) {
			console.error("No trace data available.");
			return;
		}

		const buffer = new TextEncoder().encode(data).buffer;
		const perfettoWindow = window.open("https://ui.perfetto.dev");

		if (!perfettoWindow) {
			console.error("Failed to open Perfetto UI window.");
			return;
		}

		const interval = setInterval(() => {
			if (!perfettoWindow || perfettoWindow.closed) {
				clearInterval(interval);
				return;
			}

			perfettoWindow.postMessage("PING", "*");
		}, 100);

		const handleMessage = (event: MessageEvent) => {
			if (event.source !== perfettoWindow) return;
			if (event.data !== "PONG") return;

			clearInterval(interval);
			window.removeEventListener("message", handleMessage);

			perfettoWindow.postMessage(
				{
					perfetto: {
						buffer,
						title: "trace.json",
					},
				},
				"*",
			);
		};

		window.addEventListener("message", handleMessage);
	}, [data]);
	return (
		<Stack gap={2} sx={{ m: 4, alignItems: "center" }}>
			<Typography variant="h4">Perfetto</Typography>
			<Typography variant="body1">
				perfetto.dev is a system profiling, app tracing, and trace analysis tool
			</Typography>

			<Button
				onClick={launchPerfetto}
				variant="contained"
				startIcon={<Speed />}
				disabled={!data}
			>
				Open in Perfetto
			</Button>
		</Stack>
	);
};
