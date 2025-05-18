import { Stack, TextField } from "@mui/material";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Step from "@mui/material/Step";
import StepContent from "@mui/material/StepContent";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";
import BigAction from "../components/big-action";
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
	const { data: serverCwd, refetch } = trpc.getCWD.useQuery();
	const { mutateAsync: mutateCWD } = trpc.setCWD.useMutation({
		onSuccess: () => {
			refetch();
		},
	});
	const [localCwd, setLocalCwd] = useState<string | undefined>(undefined);

	useEffect(() => {
		setLocalCwd(serverCwd);
	}, [serverCwd]);

	const onContinue = useCallback(async () => {
		if (!localCwd) {
			alert("Please enter a path");
			return;
		}
		await mutateCWD(localCwd);
		handleNext();
	}, [handleNext, localCwd, mutateCWD]);

	return (
		<>
			<StepLabel>Select Code</StepLabel>
			<StepContent>
				<Stack spacing={4}>
					<Stack spacing={2}>
						<Typography>
							The root of the package you'd like to investigate
						</Typography>
						<Stack direction="row" spacing={2}>
							<TextField
								label="Path to code"
								variant="outlined"
								value={localCwd ?? ""}
								onChange={(e) => {
									setLocalCwd(e.target.value);
								}}
								fullWidth
							/>
							<Button>Locate</Button>
						</Stack>
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
	const { mutateAsync: generateTrace } = trpc.generateTrace.useMutation();
	const { mutateAsync: cpuProfile } = trpc.cpuProfile.useMutation();
	const { mutateAsync: analyzeTrace } = trpc.analyzeTrace.useMutation();

	const onGenerateTrace = useCallback(async () => {
		const result = await generateTrace({ incremental: false });
		console.log("result", result);
	}, [generateTrace]);

	const onCpuProfile = useCallback(async () => {
		const result = await cpuProfile();
		console.log("result", result);
	}, [cpuProfile]);

	const onAnalyzeTrace = useCallback(async () => {
		const result = await analyzeTrace({});
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
						unlocks={["Search Types", "Perfetto", "trace.json", "types.json"]}
						onDoIt={onGenerateTrace}
					/>
					<BigAction
						title="CPU Profile"
						description="Have TypeScript emit a v8 CPU profile during the compiler run. The CPU profile can provide insight into why your builds may be slow."
						unlocks={["SpeedScope", "tsc.cpuprofile"]}
						onDoIt={onCpuProfile}
					/>
					<BigAction
						title="Analyze Hot Spots"
						description="Identify clear-cut hot-spots and provide enough context to extract a small repro. The repro can then be used as the basis of a bug report or a starting point for manual code inspection or profiling."
						unlocks={['Type Network', "Heatmap", "Analyze Trace"]}
						onDoIt={onAnalyzeTrace}
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
