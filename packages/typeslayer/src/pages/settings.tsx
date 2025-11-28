import {
	FormControl,
	FormControlLabel,
	FormGroup,
	InputLabel,
	MenuItem,
	Select,
	type SelectChangeEvent,
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
	const [autoStart, setAutoStart] = useState(true);
	const [projectRoot, setProjectRoot] = useState<string>("");
	const [availableEditors, setAvailableEditors] = useState<
		Array<[string, string]>
	>([]);
	const [preferredEditor, setPreferredEditor] = useState<string>("");

	useEffect(() => {
		(async () => {
			try {
				const s: { simplifyPaths: boolean; preferEditorOpen: boolean; autoStart?: boolean } =
					await invoke("get_settings");
				setSimplifyPaths(!!s.simplifyPaths);
				setPreferEditorOpen(!!s.preferEditorOpen);
				setAutoStart(s.autoStart ?? true);
			} catch {}
			try {
				const root: string = await invoke("get_project_root");
				setProjectRoot(root);
			} catch {}
			try {
				const editors: Array<[string, string]> = await invoke(
					"get_available_editors",
				);
				setAvailableEditors(editors);
			} catch {}
			try {
				const preferred: string | null = await invoke("get_preferred_editor");
				setPreferredEditor(preferred ?? "");
			} catch {}
		})();
	}, []);

	const updateSettings = async (next: {
		simplifyPaths?: boolean;
		preferEditorOpen?: boolean;
		autoStart?: boolean;
	}) => {
		try {
			await invoke("set_settings", {
				settings: {
					simplifyPaths: next.simplifyPaths ?? simplifyPaths,
					preferEditorOpen: next.preferEditorOpen ?? preferEditorOpen,
					autoStart: next.autoStart ?? autoStart,
					availableEditors,
					preferredEditor: preferredEditor || null,
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

	const handleAutoStart = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const checked = event.target.checked;
		setAutoStart(checked);
		await updateSettings({ autoStart: checked });
	};

	const handleEditorChange = async (event: SelectChangeEvent<string>) => {
		const newEditor = event.target.value;
		setPreferredEditor(newEditor);
		try {
			await invoke("set_preferred_editor", { editor: newEditor });
		} catch (e) {
			console.error("Failed to set preferred editor", e);
		}
	};

	return (
		<Stack sx={{ p: 4, overflow: "auto", gap: 3 }}>
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
			</FormGroup>
			<FormGroup>
				<FormControlLabel
					label="Open in Editor"
					control={
						<Switch checked={preferEditorOpen} onChange={handlePreferEditor} />
					}
				/>
				<Typography variant="body2" color="textSecondary">
					When enabled, file open actions try your preferred editor.
				</Typography>

				{preferEditorOpen && availableEditors.length > 0 && (
					<FormControl sx={{ mt: 2 }}>
						<InputLabel id="editor-preference-label">
							Preferred Editor
						</InputLabel>
						<Select
							value={preferredEditor}
							onChange={handleEditorChange}
							labelId="editor-preference-label"
							label="Preferred Editor"
						>
							{availableEditors.map(([command, label]) => (
								<MenuItem key={command} value={command}>
									<Stack>
										<Typography>{label}</Typography>
										<Typography
											variant="caption"
											fontFamily="monospace"
											color="textSecondary"
										>
											{command}
										</Typography>
									</Stack>
								</MenuItem>
							))}
						</Select>
					</FormControl>
				)}
			</FormGroup>
			<FormGroup>
				<FormControlLabel
					label="Auto Start"
					control={<Switch checked={autoStart} onChange={handleAutoStart} />}
				/>
				<Typography variant="body2" color="textSecondary">
					When enabled, Typeslayer will automatically run trace, CPU profile,
					and analysis on startup and then navigate to Award Winners.
				</Typography>
			</FormGroup>
		</Stack>
	);
};
