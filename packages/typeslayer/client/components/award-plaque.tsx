import {
	Box,
	Card,
	CardActionArea,
	CardContent,
	Typography,
} from "@mui/material";
import { useState } from "react";
import { theme } from "../theme";

interface AwardPlaqueProps {
	title: string;
	icon: React.ReactNode;
	description: string;
	isActive: (award: string) => boolean;
	activate: (award: string) => void;
}

export function AwardPlaque({
	title,
	icon,
	activate,
	isActive,
}: AwardPlaqueProps) {
	return (
		<Card
			sx={{
				width: 200,
				borderRadius: 2,
				boxShadow: 4,
				textAlign: "center",
				position: "relative",
				cursor: "pointer",
				background: theme.palette.background.paper,
				border: `1px solid ${isActive(title) ? theme.palette.primary.main : "transparent"}`,
			}}
			onClick={() => activate(title)}
		>
			<CardActionArea>
				<CardContent>
					<Box sx={{ mt: 2, mb: 1 }}>{icon}</Box>
					<Typography variant="h6" component="h2" fontWeight="bold">
						{title}
					</Typography>
				</CardContent>
			</CardActionArea>
		</Card>
	);
}
