import { Biotech } from "@mui/icons-material";
import { Button, Stack, Typography } from "@mui/material";
import { useCallback } from "react";

export const SpeedScope = () => {
	const onClick = useCallback(() => {
		const traceUrl = "http://localhost:3000/static/tsc.cpuprofile";
		const speedscopeUrl = `https://www.speedscope.app/#profileURL=${encodeURIComponent(traceUrl)}`;
		const speedscopeWindow = window.open(speedscopeUrl, "_blank");
		if (!speedscopeWindow) {
			console.error("Failed to open SpeedScope window.");
			return;
		}
	}, []);

	return (
		<Stack gap={2} sx={{ m: 4, alignItems: "center" }}>
			<Stack direction="row" gap={2} alignContent="center">
				<Biotech fontSize="large" />
				<Typography variant="h4">SpeedScope</Typography>
			</Stack>
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
