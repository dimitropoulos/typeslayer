import { Flag, Insights } from "@mui/icons-material";
import {
	IconButton,
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
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
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
import { FlagsCustomizationDialog } from "../components/flags-customization-dialog";
import { InlineCode } from "../components/inline-code";
import {
	useProjectRoot,
	useSelectedTsconfig,
	useTsconfigPaths,
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
	const [processingErrorDetails, setProcessingErrorDetails] = useState<
		string | null
	>(null);
	const [processingErrorStdout, setProcessingErrorStdout] = useState<
		string | null
	>(null);
	const [processingErrorStderr, setProcessingErrorStderr] = useState<
		string | null
	>(null);
	const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [isFlagsDialogOpen, setIsFlagsDialogOpen] = useState(false);

	// Use hooks from tauri-hooks
	const projectRoot = useProjectRoot();
	const tsconfigPaths = useTsconfigPaths();
	const selectedTsconfig = useSelectedTsconfig();

	const [localProjectRoot, setLocalProjectRoot] = useState<string | undefined>(
		undefined,
	);
	const [isTyping, setIsTyping] = useState(false);
	const [isClearingOutputs, setIsClearingOutputs] = useState(false);

	const applyProjectRoot = useCallback(
		async (pkgPath: string) => {
			setLocalProjectRoot(pkgPath);
			try {
				await projectRoot.set(pkgPath);
			} catch (error) {
				console.error("Failed to set project root:", error);
				throw error;
			} finally {
				setIsTyping(false);
			}
		},
		[projectRoot.set],
	);

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

	const onTsconfigChange = useCallback(
		async (event: SelectChangeEvent<string>) => {
			const newTsconfigPath = event.target.value;
			await selectedTsconfig.set(newTsconfigPath);
		},
		[selectedTsconfig.set],
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
				await applyProjectRoot(pkgPath);
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

		setIsProcessing(true);
		setProcessingError(null);
		setProcessingErrorDetails(null);
		setProcessingErrorStdout(null);
		setProcessingErrorStderr(null);
		setIsErrorDialogOpen(false);

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
			const rawMessage = e instanceof Error ? e.message : String(e);
			const normalizedMessage = normalizeInvokeError(rawMessage);
			if (normalizedMessage.toLowerCase().includes("cancel")) {
				setProcessingError(null);
				setProcessingErrorDetails(null);
				setProcessingErrorStdout(null);
				setProcessingErrorStderr(null);
				setProcessingStep(0);
			} else {
				const { summary, details, stdout, stderr } =
					splitCompilerError(normalizedMessage);
				setProcessingError(summary);
				setProcessingErrorDetails(details);
				setProcessingErrorStdout(stdout);
				setProcessingErrorStderr(stderr);
				setIsErrorDialogOpen(true);
			}
		} finally {
			setIsProcessing(false);
		}
	}, [localProjectRoot, navigate, projectRoot.set]);

	const handleClearOrCancel = useCallback(async () => {
		setIsClearingOutputs(true);
		try {
			await invoke("clear_outputs", { cancelRunning: isProcessing });
			setProcessingError(null);
			setProcessingErrorDetails(null);
			setProcessingErrorStdout(null);
			setProcessingErrorStderr(null);
			setIsErrorDialogOpen(false);
			setProcessingStep(0);
			if (isProcessing) {
				setIsProcessing(false);
			}
		} catch (error) {
			console.error("Failed to clear outputs:", error);
			const rawMessage = error instanceof Error ? error.message : String(error);
			const normalizedMessage = normalizeInvokeError(rawMessage);
			const { summary, details, stdout, stderr } =
				splitCompilerError(normalizedMessage);
			setProcessingError(summary);
			setProcessingErrorDetails(details);
			setProcessingErrorStdout(stdout);
			setProcessingErrorStderr(stderr);
			setIsErrorDialogOpen(true);
		} finally {
			setIsClearingOutputs(false);
		}
	}, [isProcessing]);

	const handleCopyErrorDetails = useCallback(() => {
		if (!processingErrorDetails) {
			return;
		}
		navigator.clipboard
			.writeText(processingErrorDetails)
			.catch((error) => console.error("Failed to copy error details", error));
	}, [processingErrorDetails]);

	const errorDialogTitle = processingError ?? "Diagnostics failed";
	const hasStdout = !!processingErrorStdout?.trim();
	const hasStderr = !!processingErrorStderr?.trim();

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

						<Stack direction="row" gap={1} width="100%">
							<Button onClick={locatePackageJson} variant="outlined">
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
								onKeyDown={async (event) => {
									if (event.key === "Enter" && localProjectRoot) {
										event.preventDefault();
										try {
											await applyProjectRoot(localProjectRoot);
										} catch (error) {
											console.error("Failed to apply project root:", error);
										}
									}
								}}
								fullWidth
							/>
						</Stack>
					</Stack>
				</Step>

				<Step step={2}>
					<Stack direction="row" gap={2}>
						<Stack gap={1} sx={{ width: "100%" }}>
							<Typography>
								Select the <InlineCode secondary>tsconfig.json</InlineCode> to
								use for type checking.
							</Typography>

							<Select
								value={selectedTsconfig.data ?? ""}
								onChange={onTsconfigChange}
								displayEmpty
								sx={{ maxWidth: 800 }}
								renderValue={(selected) => {
									if (!selected) {
										return (
											<Stack>
												<Typography>&lt;no tsconfig&gt;</Typography>
												<Typography
													variant="caption"
													fontFamily="monospace"
													color="textSecondary"
												>
													Run <InlineCode secondary>tsc</InlineCode> without the{" "}
													<InlineCode secondary>--project</InlineCode> flag
												</Typography>
											</Stack>
										);
									}
									// Extract just the filename for display
									const filename = selected.split("/").pop() || selected;
									return (
										<Stack>
											<Typography>{filename}</Typography>
											<Typography
												variant="caption"
												fontFamily="monospace"
												color="textSecondary"
											>
												{selected}
											</Typography>
										</Stack>
									);
								}}
							>
								<MenuItem value="">
									<Stack>
										<Typography>&lt;no tsconfig&gt;</Typography>
										<Typography
											variant="caption"
											fontFamily="monospace"
											color="textSecondary"
										>
											Run <InlineCode secondary>tsc</InlineCode> without the{" "}
											<InlineCode secondary>--project</InlineCode> flag
										</Typography>
									</Stack>
								</MenuItem>
								{(tsconfigPaths.data ?? []).map((path) => {
									const filename = path.split("/").pop() || path;
									return (
										<MenuItem key={path} value={path}>
											<Stack>
												<Typography>{filename}</Typography>
												<Typography
													variant="caption"
													fontFamily="monospace"
													color="textSecondary"
												>
													{path}
												</Typography>
											</Stack>
										</MenuItem>
									);
								})}
							</Select>
						</Stack>
						<Box sx={{ alignSelf: "flex-end" }}>
							<IconButton
								onClick={() => setIsFlagsDialogOpen(true)}
								title="Customize Compiler Flags"
								sx={{ mb: 1.125 }}
							>
								<Flag fontSize="large" sx={{ minWidth: 25 }} />
							</IconButton>
							<FlagsCustomizationDialog
								open={isFlagsDialogOpen}
								onClose={() => setIsFlagsDialogOpen(false)}
							/>
						</Box>
					</Stack>
				</Step>

				<Step step={3}>
					<Stack flexDirection="column" gap={2}>
						{processingError && hasCompositeProjectError(processingError) && (
							<Alert severity="info" sx={{ mb: 1 }}>
								<Typography variant="body2">
									<strong>Tip:</strong> Your project uses composite mode. You
									may need to customize the compiler flags above to remove{" "}
									<InlineCode secondary>--incremental false</InlineCode>.
								</Typography>
							</Alert>
						)}
						{processingError && (
							<Alert
								severity="error"
								action={
									processingErrorDetails || hasStdout || hasStderr ? (
										<Button
											size="small"
											color="inherit"
											onClick={() => setIsErrorDialogOpen(true)}
										>
											View details
										</Button>
									) : undefined
								}
							>
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
						<Stack direction="row" gap={2} alignItems="center">
							<Button
								variant="contained"
								size="large"
								onClick={processTypes}
								disabled={isProcessing || !localProjectRoot}
								loading={isProcessing}
								loadingPosition="start"
								startIcon={<Insights />}
								sx={{ alignSelf: "start" }}
							>
								Run Diagnostics
							</Button>
							<Button
								variant="outlined"
								size="large"
								onClick={handleClearOrCancel}
								disabled={isClearingOutputs}
							>
								{isProcessing ? "Cancel" : "Clear"}
							</Button>
						</Stack>
					</Stack>
				</Step>
			</Stack>
			<Dialog
				open={isErrorDialogOpen}
				onClose={() => setIsErrorDialogOpen(false)}
				maxWidth="xl"
				fullWidth
			>
				<DialogTitle>{errorDialogTitle}</DialogTitle>
				<DialogContent dividers>
					<Stack gap={2}>
						{processingErrorDetails && (
							<Typography color="text.secondary">
								Detailed compiler output collected from the most recent run.
							</Typography>
						)}
						<Box
							sx={{
								display: "flex",
								flexDirection: "column",
								gap: 2,
							}}
						>
							<ErrorStreamSection
								title="STDOUT"
								content={
									hasStdout
										? (processingErrorStdout ?? "")
										: "No STDOUT output captured."
								}
							/>
							<ErrorStreamSection
								title="STDERR"
								content={
									hasStderr
										? (processingErrorStderr ?? "")
										: "No STDERR output captured."
								}
							/>
						</Box>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setIsErrorDialogOpen(false)}>Close</Button>
					<Button
						onClick={handleCopyErrorDetails}
						disabled={!processingErrorDetails}
					>
						Copy
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}

type CompilerErrorParts = {
	summary: string;
	details: string | null;
	stdout: string | null;
	stderr: string | null;
};

const normalizeInvokeError = (message: string) => {
	const invokePrefix = /^InvokeError:\s*/i;
	let normalized = message.replace(invokePrefix, "").trim();
	const quoted = normalized.match(/^"([\s\S]*)"$/);
	if (quoted) {
		normalized = quoted[1].replace(/\\"/g, '"');
	}
	return normalized.trim();
};

const splitCompilerError = (message: string): CompilerErrorParts => {
	const stdoutIndex = message.indexOf("STDOUT:");
	if (stdoutIndex === -1) {
		return {
			summary: message,
			details: message,
			stdout: null,
			stderr: null,
		};
	}
	const beforeStdout = message.slice(0, stdoutIndex).trim();
	const rest = message.slice(stdoutIndex);
	const stderrIndex = rest.indexOf("STDERR:");
	let stdoutContent = rest;
	let stderrContent: string | undefined;
	if (stderrIndex !== -1) {
		stdoutContent = rest.slice(0, stderrIndex);
		stderrContent = rest.slice(stderrIndex);
	}
	const normalizedStdout = stdoutContent.replace(/^STDOUT:\s*/i, "").trim();
	const normalizedStderr = stderrContent?.replace(/^STDERR:\s*/i, "").trim();
	const detailSections = [] as string[];
	if (normalizedStdout) {
		detailSections.push(`STDOUT:\n${normalizedStdout}`);
	}
	if (normalizedStderr) {
		detailSections.push(`STDERR:\n${normalizedStderr}`);
	}
	const details = detailSections.length ? detailSections.join("\n\n") : message;
	return {
		summary: beforeStdout || "TypeScript compilation failed",
		details,
		stdout: normalizedStdout || null,
		stderr: normalizedStderr || null,
	};
};

const ErrorStreamSection = ({
	title,
	content,
}: {
	title: string;
	content: string;
}) => (
	<Box
		sx={{
			flex: 1,
			minWidth: 0,
			border: (theme) => `1px solid ${theme.palette.divider}`,
			borderRadius: 1,
			display: "flex",
			flexDirection: "column",
			overflow: "hidden",
		}}
	>
		<Box
			sx={{
				px: 2,
				py: 1,
				bgcolor: (theme) => theme.palette.background.paper,
				borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
				fontSize: 12,
				fontWeight: 600,
				textTransform: "uppercase",
				letterSpacing: 0.75,
			}}
		>
			{title}
		</Box>
		<Box
			component="pre"
			sx={{
				m: 0,
				px: 2,
				py: 1.5,
				fontFamily: "monospace",
				whiteSpace: "pre-wrap",
				wordBreak: "break-word",
				overflow: "auto",
				maxHeight: 320,
				bgcolor: (theme) => theme.palette.background.default,
			}}
		>
			{content}
		</Box>
	</Box>
);

// Helper to detect composite project incremental error
const hasCompositeProjectError = (error: string | null) => {
	if (!error) return false;
	return error.includes(
		"Composite projects may not disable incremental compilation",
	);
};
