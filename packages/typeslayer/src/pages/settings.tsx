import {
	FormControlLabel,
	FormGroup,
	Stack,
	Switch,
	Typography,
} from "@mui/material";
import { InlineCode } from "../components/inline-code";
import { trpc } from "../trpc";

export const SettingsPage = () => {
	const { data: { simplifyPaths } = {} } = trpc.getSettings.useQuery();
	const { mutate: mutateSettings } = trpc.setSettings.useMutation();
	const handleSimplifyPaths = (event: React.ChangeEvent<HTMLInputElement>) => {
		mutateSettings({ simplifyPaths: event.target.checked });
	};

	const { data: projectRoot } = trpc.getProjectRoot.useQuery();

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
			</FormGroup>
		</Stack>
	);
};
