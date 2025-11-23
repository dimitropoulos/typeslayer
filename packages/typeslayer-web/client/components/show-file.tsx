import { Box, Button, Stack, Typography } from "@mui/material";
import { useStaticFile } from "./utils";

export function ShowFile({
	fileName,
	title,
	description,
}: {
	fileName: string;
	title: string;
	description: string;
}) {
	const data = useStaticFile(fileName);

	const formatted = data
		? JSON.stringify(JSON.parse(data), null, 2)
		: "Loading...";

	const copyToClipboard = async () => {
		if (data) {
			try {
				await navigator.clipboard.writeText(formatted);
			} catch (err) {
				console.error("Failed to copy text: ", err);
			}
		}
	};

	return (
		<Box sx={{ m: 4 }}>
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Typography variant="h4">{title}</Typography>
				<Button onClick={copyToClipboard}>Copy To Clipboard</Button>
			</Stack>
			<Typography variant="body1">{description}</Typography>
			<Box
				sx={{
					p: 2,
					border: "1px solid #ccc",
					borderRadius: 2,
					mt: 2,
					whiteSpace: "break-spaces",
					fontFamily: "monospace",
				}}
			>
				{formatted}
			</Box>
		</Box>
	);
}
