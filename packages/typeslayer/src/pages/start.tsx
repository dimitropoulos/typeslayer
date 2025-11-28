import { Insights } from "@mui/icons-material";
import {
	MenuItem,
	Select,
	type SelectChangeEvent,
	Stack,
	TextField,
} from "@mui/material";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { TypeRegistry } from "@typeslayer/validate";
import { useCallback, useEffect, useState } from "react";
import { BigAction } from "../components/big-action";
import { InlineCode } from "../components/inline-code";

export function Start() {
	const navigate = useNavigate();

	// Processing state
	const [processingStep, setProcessingStep] = useState<0 | 1 | 2 | 3>(0);
	const [processingError, setProcessingError] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);

	const queryClient = useQueryClient();

	// Project root
	const { data: serverProjectRoot } = useQuery<string>({
		queryKey: ["getProjectRoot"],
		queryFn: () => invoke("get_project_root"),
	});

	const { mutateAsync: setProjectRoot } = useMutation({
		mutationFn: (newRoot: string) =>
			invoke("set_project_root", { projectRoot: newRoot }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["getProjectRoot"] });
			queryClient.invalidateQueries({ queryKey: ["scripts"] });
			queryClient.invalidateQueries({ queryKey: ["typecheckScriptName"] });
		},
	});

	const [localProjectRoot, setLocalProjectRoot] = useState<string | undefined>(
		undefined,
	);
	const [isTyping, setIsTyping] = useState(false);

	useEffect(() => {
		if (serverProjectRoot && !isTyping) {
			setLocalProjectRoot(serverProjectRoot);
		}
	}, [serverProjectRoot, isTyping]);

	// Debounced project root validation
	useEffect(() => {
		if (!localProjectRoot || localProjectRoot === serverProjectRoot) {
			setIsTyping(false);
			return;
		}

		setIsTyping(true);
		const timer = setTimeout(async () => {
			try {
				await setProjectRoot(localProjectRoot);
			} catch (error) {
				console.error("Failed to set project root:", error);
			} finally {
				setIsTyping(false);
			}
		}, 500);

		return () => clearTimeout(timer);
	}, [localProjectRoot, serverProjectRoot, setProjectRoot]);

	// Scripts and typecheck script
	const { data: scripts } = useQuery<Record<string, string>>({
		queryKey: ["scripts"],
		queryFn: async () => invoke("get_scripts"),
	});

	const { data: typecheckScriptName } = useQuery<string | null>({
		queryKey: ["typecheckScriptName"],
		queryFn: async () => invoke("get_typecheck_script_name"),
	});

	const { mutateAsync: setTypecheckScriptName } = useMutation({
		mutationFn: (scriptName: string) =>
			invoke("set_typecheck_script_name", { scriptName }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["typecheckScriptName"] });
		},
	});

	const onScriptChange = useCallback(
		async (event: SelectChangeEvent<string>) => {
			const newScriptName = event.target.value;
			if (!scripts || !(newScriptName in scripts)) {
				alert(`Script ${newScriptName} not found in package.json scripts`);
				return;
			}
			await setTypecheckScriptName(newScriptName);
		},
		[scripts, setTypecheckScriptName],
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
				await setProjectRoot(pkgPath);
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
		if (!typecheckScriptName) {
			alert("Please select a typecheck script");
			return;
		}

		setIsProcessing(true);
		setProcessingError(null);

		try {
			// Ensure project root is synced
			await setProjectRoot(localProjectRoot);

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
	}, [localProjectRoot, typecheckScriptName, navigate, setProjectRoot]);

	return (
		<Box sx={{ px: 4, overflowY: "auto", maxHeight: "100%" }}>
			<h1>Start</h1>

			{/* Project Setup Section */}
			<Stack spacing={4} sx={{ mt: 2, mb: 4 }}>
				<Stack gap={2}>
					<Typography variant="h4">Locate</Typography>
					<Typography>
						Select the <InlineCode secondary>package.json</InlineCode> of the
						package you'd like to investigate.
					</Typography>
					<Stack direction="row" gap={2}>
						<Button onClick={locatePackageJson} variant="outlined" size="small">
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

				<Stack gap={2}>
					<Typography>
						The script you use to type-check your project.
					</Typography>

					<Select
						value={typecheckScriptName ?? ""}
						onChange={onScriptChange}
						displayEmpty
						sx={{ maxWidth: 600 }}
						renderValue={(selected) => {
							if (!selected) {
								return (
									<Stack>
										<Typography>&lt;your type-check script&gt;</Typography>
										<Typography
											variant="caption"
											fontFamily="monospace"
											color="textSecondary"
										>
											for example:{" "}
											<InlineCode secondary>tsc --noEmit</InlineCode>
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
										<InlineCode secondary>{scripts?.[selected]}</InlineCode>
									</Typography>
								</Stack>
							);
						}}
					>
						{Object.entries(scripts ?? {}).map(([name, command]) => (
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
			</Stack>

			{/* Diagnostics Section */}
			<Stack spacing={2} sx={{ mb: 4 }}>
				<Typography variant="h4">Diagnostics</Typography>
				<Stack sx={{ gap: 3, flexDirection: "row", flexWrap: "wrap" }}>
					<BigAction
						title="Identify Types"
						description="This makes TypeScript generate event traces and a list of types while it type checks your codebase. This is critical information for individually identifying every type in your codebase."
						unlocks={["Search Type Id", "Perfetto"]}
						isLoading={isProcessing && processingStep === 0}
					/>
					<BigAction
						title="CPU Profile"
						description="Have TypeScript emit a v8 CPU profile during the compiler run. The CPU profile can provide insight into why your builds may be slow."
						unlocks={["SpeedScope"]}
						isLoading={isProcessing && processingStep === 1}
					/>
					<BigAction
						title="Analyze Hot Spots"
						description="Identify clear-cut hot-spots and provide enough context to extract a small repro. The repro can then be used as the basis of a bug report or a starting point for manual code inspection or profiling."
						unlocks={["Type Network", "Treemap", "Award Winners"]}
						isLoading={isProcessing && processingStep === 2}
					/>
				</Stack>
			</Stack>

			{/* Error Display */}
			{processingError && (
				<Alert severity="error" sx={{ mb: 4 }}>
					{processingError}
				</Alert>
			)}

			{/* Process Button */}
			<Stack direction="row" sx={{ mt: 4, mb: 4 }}>
				<Button
					variant="contained"
					size="large"
					onClick={processTypes}
					disabled={isProcessing || !localProjectRoot || !typecheckScriptName}
					loading={isProcessing}
					loadingPosition="start"
					startIcon={<Insights />}
				>
					Run Diagnostics
				</Button>
			</Stack>
		</Box>
	);
}
