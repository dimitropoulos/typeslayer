import { Info } from "@mui/icons-material";
import { Stack, Typography } from "@mui/material";
import { theme } from "../theme";

export function Callout({
	children,
	title,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<Stack
			gap={2}
			direction="row"
			sx={{
				background: theme.palette.background.paper,
				my: 2,
				maxWidth: 600,
				padding: 2,
				borderRadius: 2,
				color: theme.palette.text.disabled,
			}}
		>
			<Info sx={{ fontSize: "1.5em", mt: 0.5 }} />
			<Stack spacing={2} sx={{ opacity: 0.9, alignItems: "flex-start" }}>
				<Typography variant="h6">{title}</Typography>
				{children}
			</Stack>
		</Stack>
	);
}
