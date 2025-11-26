import { Box, Button } from "@mui/material";
import { invoke } from "@tauri-apps/api/core";

export const Integrations = () => {
	async function validateTypesJson() {
		const result = await invoke("validate_types_json");
		console.log(result);
	}

	return (
		<div style={{ padding: "20px" }}>
			<h1>Integrations</h1>
			<p>TODO: how to integrate this on your CI</p>

			<Box>
				<Button onClick={validateTypesJson}>Validate types.json</Button>
			</Box>
		</div>
	);
};
