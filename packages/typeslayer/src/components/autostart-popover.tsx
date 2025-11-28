import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export type AutoStartDialogProps = {
	open: boolean;
	step: 0 | 1 | 2 | 3;
	error?: string | null;
	onClose?: () => void;
	projectRoot?: string;
	selectedScript?: string | null;
	onBegin: () => void;
};

export function AutoStartDialog({
	open,
	step,
	error,
	onClose,
	projectRoot,
	selectedScript,
	onBegin,
}: AutoStartDialogProps) {
	return (
		<Dialog open={open} onClose={onClose} fullScreen>
			<Stack sx={{ p: 4, gap: 2 }}>
				<Typography variant="h4">Automatically Slay Types</Typography>
				<Stack>
					<Typography variant="body1">Project Path</Typography>
					<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
						{projectRoot ?? "—"}
					</Typography>
				</Stack>
				<Stack>
					<Typography variant="body1">Selected Script</Typography>
					<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
						{selectedScript ?? "—"}
					</Typography>
				</Stack>
				<Typography variant="body2" color="text.secondary">
					Steps: trace → CPU profile → analysis
				</Typography>
				<Divider sx={{ my: 1 }} />
				<StepRow label="Generate trace" done={step > 0} active={step === 0} />
				<StepRow label="CPU profile" done={step > 1} active={step === 1} />
				<StepRow label="Analyze trace" done={step > 2} active={step === 2} />
				{error && (
					<Stack direction="row" gap={1} alignItems="center" sx={{ mt: 1 }}>
						<ErrorIcon color="error" fontSize="small" />
						<Typography variant="body2" color="error">
							{error}
						</Typography>
					</Stack>
				)}
				<Stack direction="row" gap={2} sx={{ mt: 2 }}>
					<Button variant="contained" onClick={onBegin}>
						Begin
					</Button>
					<Button variant="text" onClick={onClose}>
						Close
					</Button>
				</Stack>
			</Stack>
		</Dialog>
	);
}

function StepRow({
	label,
	done,
	active,
}: {
	label: string;
	done: boolean;
	active: boolean;
}) {
	return (
		<Stack direction="row" gap={1} alignItems="center">
			{done ? (
				<CheckCircleIcon color="success" fontSize="small" />
			) : active ? (
				<HourglassBottomIcon color="action" fontSize="small" />
			) : (
				<HourglassBottomIcon color="disabled" fontSize="small" />
			)}
			<Typography variant="body2">{label}</Typography>
		</Stack>
	);
}
