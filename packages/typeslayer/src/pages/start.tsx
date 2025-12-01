import { Insights } from "@mui/icons-material";
import {
	MenuItem,
	Select,
	type SelectChangeEvent,
	Stack,
	TextField,
	useTheme,
} from "@mui/material";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { TypeRegistry } from "@typeslayer/validate";
import {
	type PropsWithChildren,
	useCallback,
	useEffect,
	useState,
} from "react";
import { BigAction } from "../components/big-action";
import { InlineCode } from "../components/inline-code";
import {
	useProjectRoot,
	useScripts,
	useTypecheckScriptName,
} from "../hooks/tauri-hooks";

export const Step = ({
	step,
	children,
}: PropsWithChildren<{ step: number }>) => {
	const theme = useTheme();
	return (
		<Box sx={{ gap: 2, display: "flex" }}>
			<Typography
				variant="h6"
				component="div"
				sx={{
					borderRight: `2px solid ${theme.palette.divider}`,
					pr: 1,
					color: "text.secondary",
				}}
			>
				{step}
			</Typography>
			{children}
		</Box>
	);
};

export function Start() {
	const navigate = useNavigate();

	// Processing state
	const [processingStep, setProcessingStep] = useState<0 | 1 | 2 | 3>(0);
	const [processingError, setProcessingError] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);

	// Use hooks from tauri-hooks
	const projectRoot = useProjectRoot();
	const scripts = useScripts();
	const typecheckScriptName = useTypecheckScriptName();

	const [localProjectRoot, setLocalProjectRoot] = useState<string | undefined>(
		undefined,
	);
	const [isTyping, setIsTyping] = useState(false);

	useEffect(() => {
		if (projectRoot.data && !isTyping) {
			setLocalProjectRoot(projectRoot.data);
		}
	}, [projectRoot.data, isTyping]);

	// Debounced project root validation
	useEffect(() => {
		if (!localProjectRoot || localProjectRoot === projectRoot.data) {
			setIsTyping(false);
			return;
		}

		setIsTyping(true);
		const timer = setTimeout(async () => {
			try {
				await projectRoot.set(localProjectRoot);
			} catch (error) {
				console.error("Failed to set project root:", error);
			} finally {
				setIsTyping(false);
			}
		}, 500);

		return () => clearTimeout(timer);
	}, [localProjectRoot, projectRoot.data, projectRoot.set]);

	const onScriptChange = useCallback(
		async (event: SelectChangeEvent<string>) => {
			const newScriptName = event.target.value;
			if (!scripts.data || !(newScriptName in scripts.data)) {
				alert(`Script ${newScriptName} not found in package.json scripts`);
				return;
			}
			await typecheckScriptName.set(newScriptName);
		},
		[scripts.data, typecheckScriptName.set],
	);

	async function locatePackageJson() {
		try {
			const selected = await open({
				multiple: false,
				filters: [{ name: "package.json", extensions: ["json"] }],
			});
			if (selected && typeof selected === "string") {
				// Normalize to package.json path
				let pkgPath = selected;
				if (!pkgPath.endsWith("package.json")) {
					// If it's a directory, append package.json
					if (!pkgPath.endsWith("/")) {
						pkgPath += "/";
					}
					pkgPath += "package.json";
				}
			setLocalProjectRoot(pkgPath);
			await projectRoot.set(pkgPath);
			}
		} catch (error) {
			console.error("Failed to open file picker:", error);
		}
	}

	// Sequential processing logic
	const processTypes = useCallback(async () => {
		if (!localProjectRoot) {
			alert("Please enter a path");
			return;
		}
		if (!typecheckScriptName.data) {
			alert("Please select a typecheck script");
			return;
		}

		setIsProcessing(true);
		setProcessingError(null);

		try {
			// Ensure project root is synced
			await projectRoot.set(localProjectRoot);

			// 1. generate_trace
			setProcessingStep(0);
			const traceResult =
				await invoke<Array<{ id: number; [key: string]: unknown }>>(
					"generate_trace",
				);
			const typeRegistryEntries: Array<[number, unknown]> = traceResult.map(
				(type) => [type.id, type],
			);
			window.typeRegistry = new Map(typeRegistryEntries) as TypeRegistry;

			// 2. generate_cpu_profile
			setProcessingStep(1);
			await invoke("generate_cpu_profile");

			// 3. analyze_trace_command
			setProcessingStep(2);
			await invoke("analyze_trace_command");

			// done
			setProcessingStep(3);
			setTimeout(() => {
				navigate({
					to: "/award-winners/$awardId",
					params: { awardId: "largest-union" },
				});
			}, 400);
		} catch (e) {
			setProcessingError(String(e));
			setIsProcessing(false);
		}
	}, [localProjectRoot, typecheckScriptName.data, navigate, projectRoot.set]);

	return (
		<Box sx={{ px: 4, overflowY: "auto", maxHeight: "100%", gap: 2, pb: 4 }}>
			<h1>Start</h1>

			<Stack gap={3}>
				<Step step={1}>
					<Stack gap={1} sx={{ width: "100%" }}>
						<Typography>
							Locate the <InlineCode secondary>package.json</InlineCode> of the
							package you'd like to investigate.
						</Typography>

						<Stack direction="row" gap={2} width="100%">
							<Button
								onClick={locatePackageJson}
								variant="outlined"
								size="small"
							>
								Locate
							</Button>
							<TextField
								size="small"
								placeholder="path to package.json"
								variant="outlined"
								value={localProjectRoot ?? ""}
								onChange={(e) => {
									setLocalProjectRoot(e.target.value);
								}}
								fullWidth
							/>
						</Stack>
					</Stack>
				</Step>

				<Step step={2}>
					<Stack gap={1}>
						<Typography>
							The script you use to call <InlineCode secondary>tsc</InlineCode>{" "}
							and type-check your project.
						</Typography>

					<Select
						value={typecheckScriptName.data ?? ""}
						onChange={onScriptChange}
							displayEmpty
							sx={{ maxWidth: 600 }}
							renderValue={(selected) => {
								if (!selected) {
									return (
										<Stack>
											<Typography>&lt;your script&gt;</Typography>
											<Typography
												variant="caption"
												fontFamily="monospace"
												color="textSecondary"
											>
												<InlineCode secondary>tsc --noEmit</InlineCode> (for
												example)
											</Typography>
										</Stack>
									);
								}
								return (
									<Stack>
										<Typography>{selected}</Typography>

										<Typography
											variant="caption"
											fontFamily="monospace"
											color="textSecondary"
										>
											<InlineCode secondary>
											{scripts.data && selected ? scripts.data[selected] : ""}
										</InlineCode>
										</Typography>
									</Stack>
								);
							}}
						>
							{Object.entries(scripts.data ?? {}).map(([name, command]) => (
								<MenuItem key={name} value={name}>
									<Stack>
										<Typography>{name}</Typography>
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
					</Stack>
				</Step>

				<Step step={3}>
					<Stack flexDirection="column" gap={2}>
						{processingError && (
							<Alert severity="error">
								{processingError}
							</Alert>
						)}
						<Stack sx={{ gap: 2, flexDirection: "row", flexWrap: "wrap" }}>
							<BigAction
								title="Identify Types"
								description="Generate event traces and and identification for all types from the TypeScript compiler checking your codebase."
								unlocks={["Search Types", "Perfetto"]}
								isLoading={isProcessing && processingStep === 0}
							/>
							<BigAction
								title="CPU Profile"
								description="A v8 CPU profile from the TypeScript compiler during type checking.  This can be a critical tool for identifying bottlenecks."
								unlocks={["SpeedScope"]}
								isLoading={isProcessing && processingStep === 1}
							/>
							<BigAction
								title="Analyze Hot Spots"
								description="Identify computational hot-spots in your type checking, along with duplicate type packages inclusions, unterminated events."
								unlocks={["Type Network", "Treemap", "Award Winners"]}
								isLoading={isProcessing && processingStep === 2}
							/>
						</Stack>
						<Button
							variant="contained"
							size="large"
							onClick={processTypes}
							disabled={
								isProcessing || !localProjectRoot || !typecheckScriptName
							}
							loading={isProcessing}
							loadingPosition="start"
							startIcon={<Insights />}
							sx={{ alignSelf: "start" }}
						>
							Run Diagnostics
						</Button>
					</Stack>
				</Step>
			</Stack>
		</Box>
	);
}
