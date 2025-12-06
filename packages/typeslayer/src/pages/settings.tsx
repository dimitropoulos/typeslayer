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
import { InlineCode } from "../components/inline-code";
import {
  useAutoStart,
  useAvailableEditors,
  usePreferEditorOpen,
  usePreferredEditor,
  useProjectRoot,
  useRelativePaths,
} from "../hooks/tauri-hooks";

export const SettingsPage = () => {
  const relativePaths = useRelativePaths();
  const preferEditorOpen = usePreferEditorOpen();
  const autoStart = useAutoStart();
  const projectRoot = useProjectRoot();
  const availableEditors = useAvailableEditors();
  const preferredEditor = usePreferredEditor();

  const handleRelativePaths = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    await relativePaths.set(event.target.checked);
  };

  const handlePreferEditor = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    await preferEditorOpen.set(event.target.checked);
  };

  const handleAutoStart = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    await autoStart.set(event.target.checked);
  };

  const handleEditorChange = async (event: SelectChangeEvent<string>) => {
    await preferredEditor.set(event.target.value);
  };

  const projectRootDisplay = projectRoot.data?.endsWith("/package.json")
    ? projectRoot.data.slice(0, -13)
    : projectRoot.data || "";

  return (
    <Stack sx={{ p: 4, overflow: "auto", gap: 3 }}>
      <Typography variant="h2">Settings</Typography>
      <FormGroup>
        <FormControlLabel
          label="Relative Paths"
          control={
            <Switch
              checked={relativePaths.data}
              onChange={handleRelativePaths}
              disabled={relativePaths.isLoading}
            />
          }
        />
        <Typography variant="body2" color="textSecondary">
          When enabled, any paths that match the root of your project will be
          trimmed.
        </Typography>
        <Typography variant="body2" color="textSecondary" lineHeight={2}>
          For example, if your project root is
          <br />
          <InlineCode>{projectRootDisplay}</InlineCode>
          <br />
          and you have a file at
          <br />
          <InlineCode>{projectRootDisplay}/</InlineCode>
          <InlineCode secondary>src/index.ts</InlineCode>
          <br />
          that file's path will be displayed as
          <br />
          <InlineCode secondary>src/index.ts</InlineCode>
        </Typography>
      </FormGroup>
      <FormGroup>
        <FormControlLabel
          label="Open in Editor"
          control={
            <Switch
              checked={preferEditorOpen.data}
              onChange={handlePreferEditor}
              disabled={preferEditorOpen.isLoading}
            />
          }
        />
        <Typography variant="body2" color="textSecondary">
          When enabled, file open actions try your preferred editor.
        </Typography>

        {preferEditorOpen.data &&
          availableEditors.data &&
          availableEditors.data.length > 0 && (
            <FormControl sx={{ mt: 2 }}>
              <InputLabel id="editor-preference-label">
                Preferred Editor
              </InputLabel>
              <Select
                value={preferredEditor.data || ""}
                onChange={handleEditorChange}
                labelId="editor-preference-label"
                label="Preferred Editor"
                disabled={preferredEditor.isLoading}
                sx={{
                  width: 200,
                }}
              >
                {availableEditors.data.map(([command, label]) => (
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
          control={
            <Switch
              checked={autoStart.data}
              onChange={handleAutoStart}
              disabled={autoStart.isLoading}
            />
          }
        />
        <Typography variant="body2" color="textSecondary">
          When enabled, TypeSlayer will automatically run trace, CPU profile,
          and analysis on startup and then navigate to Award Winners.
        </Typography>
      </FormGroup>
    </Stack>
  );
};
