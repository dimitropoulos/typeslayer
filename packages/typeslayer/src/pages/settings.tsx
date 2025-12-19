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
import { type ReactNode, useCallback, useMemo } from "react";
import { InlineCode } from "../components/inline-code";
import { detectPlatformSlash } from "../components/utils";
import {
  useAutoStart,
  useAvailableEditors,
  useDataDir,
  useMaxNodes,
  usePreferEditorOpen,
  usePreferredEditor,
  useProjectRoot,
  useRelativePaths,
} from "../hooks/tauri-hooks";

const limitNodes = [
  { label: `I'm too young to die`, value: 500_000 },
  { label: "Hey, not too rough", value: 1_000_000 },
  { label: "Hurt me plenty", value: 1_500_000 },
  { label: "Ultra-Violence", value: 2_000_000 },
  { label: "Nightmare!", value: 5_000_000 },
] as const;

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
  const { data: maxNodes, set: setMaxNodes } = useMaxNodes();

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

  const pathSeparator = useMemo(detectPlatformSlash, []);

  const projectRootDisplay = projectRoot.data?.endsWith(pathSeparator)
    ? projectRoot.data
    : `${projectRoot.data}${pathSeparator}`;

  const handleOpenDataDir = useCallback(async () => {
    if (!dataDir.data) {
      return;
    }
    await invoke<void>("open_file", { path: dataDir.data });
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
                checked={relativePaths.data ?? false}
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
            <InlineCode primary>{projectRootDisplay}</InlineCode>
            <br />
            and you have a file at
            <br />
            <InlineCode primary>{projectRootDisplay}</InlineCode>
            <InlineCode>src{pathSeparator}index.ts</InlineCode>
            <br />
            that file's path will be displayed as
            <br />
            <InlineCode>
              .{pathSeparator}src{pathSeparator}index.ts
            </InlineCode>
          </Typography>
        </FormGroup>
      </Setting>

      <Setting title="Editor Preferences">
        <FormGroup>
          <FormControlLabel
            label="Open in Editor"
            control={
              <Switch
                checked={preferEditorOpen.data ?? false}
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

      <Setting title="Max Nodes in the Type Graph">
        <Typography variant="body2" color="textSecondary" mb={1}>
          some of you nerds have {(3_000).toLocaleString()}-package-monorepos
          that need 60 GiB of ram to typecheck, producing multi-GiB{" "}
          <InlineCode>trace.json</InlineCode> files.... and you act surprised
          when you get 0.005fps when rendering the graph.
        </Typography>
        <Typography variant="body2" color="textSecondary" mb={1}>
          TypeSlayer uses WebGL to render the Type Graph, but even then some of
          you have more nodes than there are polygons in a frame of GTA6.{" "}
          <em>there are limits</em>, here.
        </Typography>
        <FormControl>
          <InputLabel id="max-nodes-label">Max Nodes</InputLabel>
          <Select
            value={maxNodes?.toString() || ""}
            onChange={async event => {
              const value = parseInt(event.target.value, 10);
              await setMaxNodes(value);
            }}
            labelId="max-nodes-label"
            label="Max Nodes"
            disabled={maxNodes === undefined}
            sx={{
              width: 250,
            }}
          >
            {limitNodes.map(({ label, value }) => (
              <MenuItem key={value} value={value.toString()}>
                <Stack>
                  <Typography>{label}</Typography>
                  <Typography
                    variant="caption"
                    fontFamily="monospace"
                    color="textSecondary"
                  >
                    <InlineCode>{value.toLocaleString()}</InlineCode> nodes
                  </Typography>
                </Stack>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Setting>

      <Setting title="Auto Start">
        <FormGroup>
          <FormControlLabel
            label="Auto Start"
            control={
              <Switch
                checked={autoStart.data ?? false}
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
          <InlineCode primary>
            {dataDir.isLoading ? "Loading..." : dataDir.data || "Not set"}
          </InlineCode>
        </Stack>
      </Setting>
    </Stack>
  );
};
