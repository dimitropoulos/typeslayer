import {
	FormControlLabel,
	FormGroup,
	Stack,
	Switch,
	Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { InlineCode } from "../components/inline-code";

export const SettingsPage = () => {
	const [simplifyPaths, setSimplifyPaths] = useState(false);
	const [preferEditorOpen, setPreferEditorOpen] = useState(false);
	const [projectRoot, setProjectRoot] = useState<string>("");

	useEffect(() => {
		(async () => {
			try {
				const s: { simplifyPaths: boolean; preferEditorOpen: boolean } =
					await invoke("get_settings");
				setSimplifyPaths(!!s.simplifyPaths);
				setPreferEditorOpen(!!s.preferEditorOpen);
			} catch {}
			try {
				const root: string = await invoke("get_project_root");
				setProjectRoot(root);
			} catch {}
		})();
	}, []);

	const updateSettings = async (next: {
		simplifyPaths?: boolean;
		preferEditorOpen?: boolean;
	}) => {
		try {
			await invoke("set_settings", {
				settings: {
					simplifyPaths: next.simplifyPaths ?? simplifyPaths,
					preferEditorOpen: next.preferEditorOpen ?? preferEditorOpen,
				},
			});
		} catch (e) {
			console.error("Failed to save settings", e);
		}
	};

	const handleSimplifyPaths = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const checked = event.target.checked;
		setSimplifyPaths(checked);
		await updateSettings({ simplifyPaths: checked });
	};

	const handlePreferEditor = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const checked = event.target.checked;
		setPreferEditorOpen(checked);
		await updateSettings({ preferEditorOpen: checked });
	};

	return (
		<Stack sx={{ m: 4, maxWidth: 500 }} gap={3}>
			<Typography variant="h5" component="h1">
				Settings
			</Typography>
			<FormGroup>
				<FormControlLabel
					label="Simplify Paths"
					control={
						<Switch checked={simplifyPaths} onChange={handleSimplifyPaths} />
					}
				/>
				<Typography variant="body2" color="textSecondary">
					When enabled, any paths that match the root of your project will be
					trimmed.
				</Typography>
				<Typography variant="body2" color="textSecondary">
					For example, if your project is at{" "}
					<InlineCode>{projectRoot}</InlineCode> and you have a file at{" "}
					<InlineCode>{projectRoot}/src/index.ts</InlineCode>, it will be
					displayed as <InlineCode>src/index.ts</InlineCode>.
				</Typography>
				<FormControlLabel
					label="Open in Editor (VS Code)"
					control={
						<Switch checked={preferEditorOpen} onChange={handlePreferEditor} />
					}
				/>
				<Typography variant="body2" color="textSecondary">
					When enabled, file open actions try VS Code first.
				</Typography>
			</FormGroup>
		</Stack>
	);
};
