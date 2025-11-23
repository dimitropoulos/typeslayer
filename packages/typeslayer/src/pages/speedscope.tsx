import { Button, Stack, Typography } from "@mui/material";
import { CPU_PROFILE_FILENAME } from "@typeslayer/validate";
import { useCallback } from "react";
import { SERVER_PORT } from "../components/constants";

export const SpeedScope = () => {
	const onClick = useCallback(() => {
		const traceUrl = `http://localhost:${SERVER_PORT}/static/${CPU_PROFILE_FILENAME}`;
		const speedscopeUrl = `https://www.speedscope.app/#profileURL=${encodeURIComponent(traceUrl)}`;
		const speedscopeWindow = window.open(speedscopeUrl, "_blank");
		if (!speedscopeWindow) {
			console.error("Failed to open SpeedScope window.");
			return;
		}
	}, []);

	return (
		<Stack gap={2} sx={{ mx: 4 }}>
			<h1>SpeedScope</h1>
			<Typography variant="body1">
				SpeedScope.app is a tool for visualizing the CPU profile for the type
				checking run.
			</Typography>
			<Button variant="contained" onClick={onClick}>
				Open SpeedScope
			</Button>
		</Stack>
	);
};
