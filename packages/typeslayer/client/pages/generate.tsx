import {
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	type SelectChangeEvent,
	Stack,
	TextField,
} from "@mui/material";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Step from "@mui/material/Step";
import StepContent from "@mui/material/StepContent";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Typography from "@mui/material/Typography";
import type { TypeRegistry } from "@typeslayer/validate";
import { useCallback, useEffect, useState } from "react";
import BigAction from "../components/big-action";
import { InlineCode } from "../components/inline-code";
import { trpc } from "../trpc";

export function Generate() {
	const [activeStep, setActiveStep] = useState(1);

	const handleNext = () => {
		setActiveStep((prevActiveStep) => prevActiveStep + 1);
	};

	const handleBack = () => {
		setActiveStep((prevActiveStep) => prevActiveStep - 1);
	};

	const handleReset = () => {
		setActiveStep(0);
	};

	return (
		<Box sx={{ m: 4 }}>
			<Stepper activeStep={activeStep} orientation="vertical">
				<Step>
					<SelectCode handleNext={handleNext} />
				</Step>
				<Step>
					<RunDiagnostics handleBack={handleBack} handleNext={handleNext} />
				</Step>
				<Step>
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
	const { data: serverProjectRoot, refetch } = trpc.getProjectRoot.useQuery();
	const { mutateAsync: mutateProjectRoot } = trpc.setProjectRoot.useMutation({
		onSuccess: () => {
			refetch();
		},
	});
	const [localProjectRoot, setLocalProjectRoot] = useState<string | undefined>(
		undefined,
	);

	useEffect(() => {
		setLocalProjectRoot(serverProjectRoot);
	}, [serverProjectRoot]);

	const onContinue = useCallback(async () => {
		if (!localProjectRoot) {
			alert("Please enter a path");
			return;
		}
		await mutateProjectRoot(localProjectRoot);
		handleNext();
	}, [handleNext, localProjectRoot, mutateProjectRoot]);

	const { data: potentialScripts } = trpc.getPotentialScripts.useQuery();
	const { data: scriptName, refetch: refetchScriptName } =
		trpc.getScriptName.useQuery();
	const { mutateAsync: mutateScriptName } = trpc.setScriptName.useMutation();
	const onScriptChange = useCallback(
		async (event: SelectChangeEvent<string>) => {
			const newScriptName = event.target.value;
			console.log("onScriptChange", newScriptName);
			if (!Object.hasOwn(potentialScripts ?? {}, newScriptName)) {
				alert(`Script ${newScriptName} not found in package.json scripts`);
				return;
			}
			await mutateScriptName(newScriptName);
			await refetchScriptName();
		},
		[mutateScriptName, potentialScripts, refetchScriptName],
	);

	return (
		<>
			<StepLabel>Select Code</StepLabel>
			<StepContent>
				<Stack spacing={4} sx={{ mt: 2, maxWidth: 700 }}>
					<Stack gap={2}>
						<Typography>
							The <InlineCode>package.json</InlineCode> of the package you'd
							like to investigate.
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
								sx={{ maxWidth: 600 }}
							/>
							<Button>Locate</Button>
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
								value={scriptName ?? ""}
								onChange={onScriptChange}
								displayEmpty
								labelId="type-check-script"
								label="type-check-script"
								sx={{ maxWidth: 600 }}
							>
								{Object.entries(potentialScripts ?? {}).map(
									([name, command]) => (
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
									),
								)}
							</Select>
						</FormControl>
					</Stack>
				</Stack>

				<Button variant="contained" onClick={onContinue} sx={{ mt: 4 }}>
					Continue
				</Button>
			</StepContent>
		</>
	);
};

const RunDiagnostics = ({
	handleNext,
	handleBack,
}: {
	handleNext: () => void;
	handleBack: () => void;
}) => {
	const { mutateAsync: generateTrace, isPending: generateTracePending } =
		trpc.generateTrace.useMutation();
	const { mutateAsync: cpuProfile, isPending: cpuProfilePending } =
		trpc.cpuProfile.useMutation();
	const { mutateAsync: analyzeTrace, isPending: analyzeTracePending } =
		trpc.analyzeTrace.useMutation();

	const onGenerateTrace = useCallback(async () => {
		const result = await generateTrace();
		window.typeRegistry = new Map(result.typeRegistryEntries) as TypeRegistry;
		console.log("result", result);
	}, [generateTrace]);

	const onCpuProfile = useCallback(async () => {
		const result = await cpuProfile();
		console.log("result", result);
	}, [cpuProfile]);

	const onAnalyzeTrace = useCallback(async () => {
		const result = await analyzeTrace();
		console.log("result", result);
	}, [analyzeTrace]);

	return (
		<>
			<StepLabel>Run Diagnostics</StepLabel>
			<StepContent>
				<Stack gap={3}>
					<BigAction
						title="Identify Types"
						description="This makes TypeScript generate event traces and a list of types while it type checks your codebase.  This is critical information for individually identifying every type in your codebase."
						unlocks={["Search Type Id", "Perfetto", "trace.json", "types.json"]}
						onDoIt={onGenerateTrace}
						isLoading={generateTracePending}
					/>
					<BigAction
						title="CPU Profile"
						description="Have TypeScript emit a v8 CPU profile during the compiler run. The CPU profile can provide insight into why your builds may be slow."
						unlocks={["SpeedScope", "tsc.cpuprofile"]}
						onDoIt={onCpuProfile}
						isLoading={cpuProfilePending}
					/>
					<BigAction
						title="Analyze Hot Spots"
						description="Identify clear-cut hot-spots and provide enough context to extract a small repro. The repro can then be used as the basis of a bug report or a starting point for manual code inspection or profiling."
						unlocks={[
							"Type Network",
							"Heatmap",
							"analyze-trace.json",
							"Award Winners",
						]}
						onDoIt={onAnalyzeTrace}
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
		</>
	);
};

const TakeAction = ({
	handleNext,
	handleBack,
}: {
	handleNext: () => void;
	handleBack: () => void;
}) => {
	return (
		<>
			<StepLabel>Take Action</StepLabel>
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
		</>
	);
};
