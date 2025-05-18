import Box from "@mui/material/Box";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import StepContent from "@mui/material/StepContent";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { Stack, TextField } from "@mui/material";
import { trpc } from "../trpc";
import { useCallback, useEffect, useState } from "react";

export function Generate() {
	const [activeStep, setActiveStep] = useState(0);

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
								value={localCwd ?? ''}
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
	const { mutateAsync } = trpc.generateTrace.useMutation();

	const onGenerate = useCallback(async () => {
		console.log("onGenerate");
		const result = await mutateAsync({ incremental: false });
		console.log("result", result);
	}, [mutateAsync]);

	return (
		<>
			<StepLabel>Run Diagnostics</StepLabel>
			<StepContent>
				<Button onClick={onGenerate}>Generate</Button>
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
				<Typography>some Description</Typography>
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
