import {
  Button,
  Card,
  CardContent,
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
import { invoke } from "@tauri-apps/api/core";
import { type ReactNode, useCallback } from "react";
import { InlineCode } from "../components/inline-code";
import {
  useAutoStart,
  useAvailableEditors,
  useDataDir,
  usePreferEditorOpen,
  usePreferredEditor,
  useProjectRoot,
  useRelativePaths,
} from "../hooks/tauri-hooks";

const Setting = ({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) => {
  return (
    <Card sx={{ flexShrink: 0 }}>
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
};

export const SettingsPage = () => {
  const relativePaths = useRelativePaths();
  const preferEditorOpen = usePreferEditorOpen();
  const autoStart = useAutoStart();
  const projectRoot = useProjectRoot();
  const availableEditors = useAvailableEditors();
  const preferredEditor = usePreferredEditor();
  const dataDir = useDataDir();

  const handleRelativePaths = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      await relativePaths.set(event.target.checked);
    },
    [relativePaths.set],
  );

  const handlePreferEditor = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      await preferEditorOpen.set(event.target.checked);
    },
    [preferEditorOpen.set],
  );

  const handleAutoStart = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      await autoStart.set(event.target.checked);
    },
    [autoStart.set],
  );

  const handleEditorChange = useCallback(
    async (event: SelectChangeEvent<string>) => {
      await preferredEditor.set(event.target.value);
    },
    [preferredEditor.set],
  );

  const projectRootDisplay = projectRoot.data?.endsWith("/package.json")
    ? projectRoot.data.slice(0, -13)
    : projectRoot.data || "";

  const handleOpenDataDir = useCallback(async () => {
    if (!dataDir.data) {
      return;
    }
    await invoke("open_file", { path: dataDir.data });
  }, [dataDir.data]);

  return (
    <Stack
      sx={{
        p: 4,
        overflow: "auto",
        gap: 3,
        maxHeight: "100%",
        minHeight: "100%",
      }}
    >
      <Typography variant="h2">Settings</Typography>

      <Setting title="Path Display">
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
      </Setting>

      <Setting title="Editor Preferences">
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
      </Setting>

      <Setting title="Auto Start">
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
      </Setting>

      <Setting title="Data Directory">
        <Typography variant="body2" color="textSecondary" lineHeight={2}>
          TypeSlayer stores its data in the following directory:
          <br />
        </Typography>

        <Stack
          sx={{ flexDirection: "row", alignItems: "center", gap: 2, mt: 1 }}
        >
          <Button size="small" variant="outlined" onClick={handleOpenDataDir}>
            Open
          </Button>
          <InlineCode>
            {dataDir.isLoading ? "Loading..." : dataDir.data || "Not set"}
          </InlineCode>
        </Stack>
      </Setting>
    </Stack>
  );
};
