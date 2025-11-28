import { Alert, Box, Button, Snackbar, Stack, Typography } from "@mui/material";
import { useState } from "react";
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
	const [toast, setToast] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	const formatted = data
		? JSON.stringify(JSON.parse(data), null, 2)
		: "Loading...";

	const copyToClipboard = async () => {
		if (!data) {
			setToast({ open: true, message: "Nothing to copy", severity: "error" });
			return;
		}
		try {
			await navigator.clipboard.writeText(formatted);
			setToast({ open: true, message: "Copied", severity: "success" });
		} catch {
			setToast({ open: true, message: "Copy failed", severity: "error" });
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
			<Snackbar
				anchorOrigin={{ vertical: "top", horizontal: "right" }}
				open={toast.open}
				onClose={() => setToast((t: typeof toast) => ({ ...t, open: false }))}
				autoHideDuration={2500}
			>
				<Alert variant="filled" severity={toast.severity}>
					{toast.message}
				</Alert>
			</Snackbar>
		</Box>
	);
}
