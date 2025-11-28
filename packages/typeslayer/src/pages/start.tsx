import {
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	type SelectChangeEvent,
	Stack,
	StepButton,
	TextField,
} from "@mui/material";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Step from "@mui/material/Step";
import StepContent from "@mui/material/StepContent";
import Stepper from "@mui/material/Stepper";
import Typography from "@mui/material/Typography";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { TypeRegistry } from "@typeslayer/validate";
import { useCallback, useEffect, useState } from "react";
import { AutoStartDialog } from "../components/autostart-popover";
import { BigAction } from "../components/big-action";
import { InlineCode } from "../components/inline-code";

const stepRoutes = ["select-code", "run-diagnostics", "take-action"] as const;
type StepRoute = (typeof stepRoutes)[number];

const getStepFromRoute = (route: string | undefined): number => {
	if (!route) return 0;
	const index = stepRoutes.indexOf(route as StepRoute);
	return index === -1 ? 0 : index;
};

const getRouteFromStep = (step: number): StepRoute | null => {
	return stepRoutes[step] ?? null;
};

export function Start() {
	const params = useParams({ strict: false });
	const navigate = useNavigate();
	const stepParam = params.step as string | undefined;

	const [activeStep, setActiveStep] = useState(getStepFromRoute(stepParam));

	// Autostart state
	const [autoStartOpen, setAutoStartOpen] = useState(false);
	const [autoStartStep, setAutoStartStep] = useState<0 | 1 | 2 | 3>(0);
	const [autoStartError, setAutoStartError] = useState<string | null>(null);
	const [projectRoot, setProjectRoot] = useState<string | undefined>(undefined);
	const [selectedScript, setSelectedScript] = useState<string | null>(null);

	// Sync active step with URL
	useEffect(() => {
		const newStep = getStepFromRoute(stepParam);
		if (newStep !== activeStep) {
			setActiveStep(newStep);
		}
	}, [stepParam, activeStep]);

	// Prepare autostart dialog data on mount
	useEffect(() => {
		(async () => {
			try {
				const root: string = await invoke("get_project_root");
				setProjectRoot(root);
			} catch {}
			try {
				const script: string | null = await invoke("get_typecheck_script_name");
				setSelectedScript(script);
			} catch {}
		})();
	}, []);

	const beginAutoStart = useCallback(async () => {
		let cancelled = false;
		try {
			// Ensure we are on the start page
			navigate({ to: "/start" });
			setAutoStartError(null);

			// 1. generate_trace
			setAutoStartStep(0);
			await invoke("generate_trace");
			if (cancelled) return;

			// 2. generate_cpu_profile
			setAutoStartStep(1);
			await invoke("generate_cpu_profile");
			if (cancelled) return;

			// 3. analyze_trace_command
			setAutoStartStep(2);
			await invoke("analyze_trace_command");
			if (cancelled) return;

			// done
			setAutoStartStep(3);
			setTimeout(() => {
				if (!cancelled) {
					setAutoStartOpen(false);
					navigate({ to: "/award-winners/$awardId", params: { awardId: "largest-union" } });
				}
			}, 400);
		} catch (e) {
			setAutoStartError(String(e));
		}
		return () => {
			cancelled = true;
		};
	}, [navigate]);

	const handleNext = () => {
		const nextStep = activeStep + 1;
		setActiveStep(nextStep);
		const route = getRouteFromStep(nextStep);
		if (route) {
			navigate({ to: `/start/${route}` });
		}
	};

	const handleBack = () => {
		const prevStep = activeStep - 1;
		setActiveStep(prevStep);
		const route = getRouteFromStep(prevStep);
		if (route) {
			navigate({ to: `/start/${route}` });
		} else {
			navigate({ to: "/start" });
		}
	};

	const handleReset = () => {
		setActiveStep(0);
		navigate({ to: "/start" });
	};

	return (
		<Box sx={{ px: 4, overflowY: "auto", maxHeight: "100%" }}>
			<h1>Start</h1>
			<AutoStartDialog
				open={autoStartOpen}
				step={autoStartStep}
				error={autoStartError}
				onClose={() => setAutoStartOpen(false)}
				projectRoot={projectRoot}
				selectedScript={selectedScript}
				onBegin={beginAutoStart}
			/>

					<Stack direction="row" sx={{ mt: 2 }}>
						<Button variant="outlined" onClick={() => setAutoStartOpen(true)}>Automatic Mode</Button>
					</Stack>
			<Stepper nonLinear activeStep={activeStep} orientation="vertical">
				<Step>
					<StepButton
						onClick={() => {
							const index = 0;
							setActiveStep(index);
							const route = getRouteFromStep(index);
							if (route) navigate({ to: `/start/${route}` });
						}}
					>
						Select Code
					</StepButton>
					<SelectCode handleNext={handleNext} />
				</Step>
				<Step>
					<StepButton
						onClick={() => {
							const index = 1;
							setActiveStep(index);
							const route = getRouteFromStep(index);
							if (route) navigate({ to: `/start/${route}` });
						}}
					>
						Run Diagnostics
					</StepButton>
					<RunDiagnostics handleBack={handleBack} handleNext={handleNext} />
				</Step>
				<Step>
					<StepButton
						onClick={() => {
							const index = 2;
							setActiveStep(index);
							const route = getRouteFromStep(index);
							if (route) navigate({ to: `/start/${route}` });
						}}
					>
						Take Action
					</StepButton>
					<TakeAction handleBack={handleBack} handleNext={handleNext} />
				</Step>
			</Stepper>

			{activeStep === 3 && (
				<Paper square elevation={0} sx={{ p: 3 }}>
					<Typography>All steps completed - you&apos;re finished</Typography>
					<Button onClick={handleReset} sx={{ mt: 1, mr: 1 }}>
						Reset
					</Button>
				</Paper>
			)}
		</Box>
	);
}

const SelectCode = ({ handleNext }: { handleNext: () => void }) => {
	const queryClient = useQueryClient();
	const { data: serverProjectRoot } = useQuery<string>({
		queryKey: ["getProjectRoot"],
		queryFn: () => invoke("get_project_root"),
	});

	const { mutateAsync: setProjectRoot } = useMutation({
		mutationFn: (newRoot: string) => invoke("set_project_root", { projectRoot: newRoot }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["getProjectRoot"] });
			queryClient.invalidateQueries({ queryKey: ["scripts"] });
			queryClient.invalidateQueries({ queryKey: ["typecheckScriptName"] });
		},
	});

	// we want the user to be able to type into this field
	const [localProjectRoot, setLocalProjectRoot] = useState<string | undefined>(
		undefined,
	);

	// TODO: debounce serverProjectRoot into localProjectRoot
	useEffect(() => {
		if (serverProjectRoot) {
			setLocalProjectRoot(serverProjectRoot);
		}
	}, [serverProjectRoot]);

	// scripts from backend (package.json scripts)
	const { data: scripts } = useQuery<Record<string, string>>({
		queryKey: ["scripts"],
		queryFn: async () => invoke("get_scripts"),
	});

	// typecheck script name
	const { data: typecheckScriptName } = useQuery<string | null>({
		queryKey: ["typecheckScriptName"],
		queryFn: async () => invoke("get_typecheck_script_name"),
	});

	const { mutateAsync: setTypecheckScriptName } = useMutation({
		mutationFn: (scriptName: string) => 
			invoke("set_typecheck_script_name", { scriptName })
		,
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

	const onContinue = useCallback(async () => {
		if (!localProjectRoot) {
			alert("Please enter a path");
			return;
		}
		await setProjectRoot(localProjectRoot);
		handleNext();
	}, [handleNext, localProjectRoot, setProjectRoot]);

	async function locatePackageJson() {
		try {
			const selected = await open({
				multiple: false,
				filters: [{ name: "package.json", extensions: ["json"] }],
			});
			if (selected && typeof selected === "string") {
				// Accept either the file or the directory; if file, strip trailing /package.json
				let dirPath = selected;
				if (dirPath.endsWith("/package.json")) {
					dirPath = dirPath.slice(0, -"/package.json".length);
				}
				// Ensure trailing slash; backend normalizes but keep UI consistent
				if (!dirPath.endsWith("/")) {
					dirPath += "/";
				}
				setLocalProjectRoot(dirPath);
				await setProjectRoot(dirPath);
			}
		} catch (error) {
			console.error("Failed to open file picker:", error);
		}
	}

	return (
		<StepContent>
			<Stack spacing={4} sx={{ mt: 2 }}>
				<Stack gap={2}>
					<Typography>
						The <InlineCode>package.json</InlineCode> of the package you'd like
						to investigate.
					</Typography>
					<Stack direction="row" gap={2}>
						<TextField
							label="Path to package"
							variant="outlined"
							value={localProjectRoot ?? ""}
							onChange={(e) => {
								setLocalProjectRoot(e.target.value);
							}}
							fullWidth
						/>
						<Button onClick={locatePackageJson}>Locate</Button>
					</Stack>
				</Stack>

				<Stack gap={1}>
					<Typography>
						Select the script you use to type-check your project.
					</Typography>
					<Typography>
						Normally this is something as simple as{" "}
						<InlineCode>"type-check": "tsc --noEmit"</InlineCode>.
					</Typography>

					<FormControl sx={{ mt: 1 }}>
						<InputLabel id="type-check-script">type-check script</InputLabel>
						<Select
							value={typecheckScriptName ?? ""}
							onChange={onScriptChange}
							displayEmpty
							labelId="type-check-script"
							label="type-check-script"
							sx={{ maxWidth: 600 }}
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
					</FormControl>
				</Stack>
			</Stack>

			<Button variant="contained" onClick={onContinue} sx={{ mt: 4 }}>
				Continue
			</Button>
		</StepContent>
	);
};

const RunDiagnostics = ({
	handleNext,
	handleBack,
}: {
	handleNext: () => void;
	handleBack: () => void;
}) => {
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const { mutate: generateTrace, isPending: generateTracePending } =
		useMutation({
			mutationFn:() => invoke<Array<{ id: number; [key: string]: unknown }>>(
						"generate_trace",
					),
			onSuccess: (result) => {
				const typeRegistryEntries: Array<[number, unknown]> = result.map(
					(type) => [type.id, type],
				);
				window.typeRegistry = new Map(typeRegistryEntries) as TypeRegistry;
			},
			onError: (err: unknown) => {
				setErrorMessage(String(err));
			},
		});

	const { mutate: cpuProfile, isPending: cpuProfilePending } = useMutation({
		mutationFn: () => invoke("generate_cpu_profile"),
		onSuccess: (result) => {
			console.log("cpuProfile result", result);
		},
		onError: (err: unknown) => {
			setErrorMessage(String(err));
		},
	});

	const { mutate: analyzeTrace, isPending: analyzeTracePending } = useMutation({
		mutationFn: () => invoke("analyze_trace_command"),
		onSuccess: (result) => {
			console.log("analyzeTrace onSuccess");
			console.log("result", result);
		},
		onError: (err: unknown) => {
			setErrorMessage(String(err));
		},
	});

return (
		<>
			<StepContent>
				<Stack sx={{ my: 2, gap: 3, flexDirection: 'row', flexWrap: 'wrap' }}>
				<BigAction
					title="Identify Types"
					description="This makes TypeScript generate event traces and a list of types while it type checks your codebase.  This is critical information for individually identifying every type in your codebase."
					unlocks={["Search Type Id", "Perfetto"]}
					onDoIt={generateTrace}
					isLoading={generateTracePending}
				/>
				<BigAction
					title="CPU Profile"
					description="Have TypeScript emit a v8 CPU profile during the compiler run. The CPU profile can provide insight into why your builds may be slow."
					unlocks={["SpeedScope"]}
					onDoIt={cpuProfile}
					isLoading={cpuProfilePending}
				/>
				<BigAction
					title="Analyze Hot Spots"
					description="Identify clear-cut hot-spots and provide enough context to extract a small repro. The repro can then be used as the basis of a bug report or a starting point for manual code inspection or profiling."
					unlocks={[
						"Type Network",
						"Treemap",
						"Award Winners",
						]}
						onDoIt={analyzeTrace}
						isLoading={analyzeTracePending}
					/>
				</Stack>
				<Stack direction="row" sx={{ mt: 2 }}>
					<Button variant="contained" onClick={handleNext}>
						Continue
					</Button>
					<Button onClick={handleBack}>Back</Button>
				</Stack>
			</StepContent>
			<Snackbar
				open={!!errorMessage}
				autoHideDuration={6000}
				onClose={() => setErrorMessage(null)}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			>
				<Alert
					severity="error"
					variant="filled"
					onClose={() => setErrorMessage(null)}
					sx={{ width: "100%" }}
				>
					{errorMessage}
				</Alert>
			</Snackbar>
		</>
	);
}

const TakeAction = ({
	handleNext,
	handleBack,
}: {
	handleNext: () => void;
	handleBack: () => void;
}) => {
	return (
		<StepContent>
			<Stack gap={1} maxWidth={500}>
				<Typography variant="h5">Have Fun!</Typography>
				<Typography>Now that you have the tools you need, dig in!</Typography>
				<Typography>
					This tools's goal is to help you identify what types are slowing you
					down, but it's always a case-by-case-basis to slay those misbehaving
					types individually.
				</Typography>
				<Typography>Good Luck!</Typography>
			</Stack>
			<Stack direction="row" sx={{ mt: 2 }}>
				<Button variant="contained" onClick={handleNext}>
					Continue
				</Button>
				<Button onClick={handleBack}>Back</Button>
			</Stack>
		</StepContent>
	);
};
