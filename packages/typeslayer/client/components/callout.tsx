import { Info } from "@mui/icons-material";
import { Stack } from "@mui/material";
import { theme } from "../theme";

export function Callout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<Stack
			gap={2}
			direction="row"
			sx={{
				fontSize: "0.8em",
				background: theme.palette.background.paper,
				my: 2,
				maxWidth: 600,
				padding: 2,
				borderRadius: 2,
				color: theme.palette.text.disabled,
			}}
		>
			<Info sx={{ fontSize: "1.5em" }} />
			<Stack spacing={2} alignItems="center" sx={{ opacity: 0.9 }}>
				{children}
			</Stack>
		</Stack>
	);
}
