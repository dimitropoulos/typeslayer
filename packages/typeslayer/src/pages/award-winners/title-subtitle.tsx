import { Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

export function TitleSubtitle({
	title,
	subtitle,
	icon,
}: {
	title: string;
	subtitle: string;
	icon: ReactNode;
}) {
	return (
		<Stack gap={1}>
			<Stack direction="row" gap={2} alignItems="center">
				{icon}
				<Typography variant="h4">{title}</Typography>
			</Stack>
			<Typography>{subtitle}</Typography>
		</Stack>
	);
}
