import { Box, Stack, Typography } from "@mui/material";

export const InlineBarGraph = ({
	width,
	label,
}: {
	width: string;
	label: string;
}) => {
	return (
		<Stack>
			<Box
				sx={{
					width,
					height: "4px",
					backgroundColor: (theme) => theme.palette.primary.main,
					borderRadius: "2px",
					marginTop: "2px",
				}}
			/>

			<Typography
				sx={{
					color: (theme) => theme.palette.text.secondary,
					fontSize: "0.8rem",
				}}
			>
				{label}
			</Typography>
		</Stack>
	);
};
