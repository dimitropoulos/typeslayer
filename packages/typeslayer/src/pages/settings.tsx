import { HelpOutline } from "@mui/icons-material";
import {
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Popover,
  Select,
  type SelectChangeEvent,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { Code } from "../components/code";
import { InlineCode } from "../components/inline-code";
import { detectPlatformSlash } from "../components/utils";
import {
  type AnalyticsConsentResult,
  useAnalyticsConsent,
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
  noMaxWidth,
}: {
  children: ReactNode;
  title: string;
  noMaxWidth?: boolean | undefined;
}) => {
  return (
    <Card sx={{ flexShrink: 0 }}>
      <CardContent sx={{ maxWidth: noMaxWidth ? undefined : 600 }}>
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
  const analyticsConsent = useAnalyticsConsent();
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

      <Setting title="Analytics">
        <Typography variant="body2" color="textSecondary" gutterBottom>
          TypeSlayer collects anonymous usage data. you can control which events
          you consent to share (and see exactly what information each event
          has).
        </Typography>
        <Typography variant="body2" color="textSecondary">
          you can think of these in two categories:
        </Typography>
        <ul style={{ fontSize: "0.9rem", paddingLeft: 22, marginTop: 2 }}>
          <li>
            <Typography variant="body2" color="textSecondary">
              <em>something went right</em>: it's hella cool of you to
              leave these on
            </Typography>
          </li>
          <li>
            <Typography variant="body2" color="textSecondary">
              <em>something went wrong</em>: pwetty pwease keep
              these on so I can fix things
            </Typography>
          </li>
        </ul>

        {analyticsConsent.data ? (
          <AnalyticsConsentTable
            consents={analyticsConsent.data}
            isLoading={analyticsConsent.isLoading}
            set={analyticsConsent.set}
          />
        ) : null}
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

const AnalyticsConsentTable = ({
  consents,
  isLoading,
  set,
}: {
  consents: AnalyticsConsentResult;
  isLoading: boolean;
  set: (args: { eventId: string; consent: boolean }) => Promise<void>;
}) => {
  return (
    <Table sx={{ maxWidth: 400, mt: 2 }} size="small" component={Paper}>
      <TableHead>
        <TableRow>
          <TableCell>Event</TableCell>
          <TableCell sx={{ pl: "10px" }}>Success</TableCell>
          <TableCell sx={{ pl: "10px" }}>Fail</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {consents.map(([description, ...events]) => (
          <TableRow key={description}>
            <TableCell>{description}</TableCell>
            {events.map(event => (
              <TableCell key={event.id} sx={{ pl: 0 }}>
                <AnalyticsSetting
                  id={event.id}
                  description={event.description}
                  jsonExample={event.jsonExample}
                  enabled={event.enabled}
                  onChange={async () => {
                    await set({
                      eventId: event.id,
                      consent: !event.enabled,
                    });
                  }}
                  isLoading={isLoading}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const AnalyticsSetting = ({
  id,
  description,
  jsonExample,
  enabled,
  onChange,
  isLoading,
}: {
  id: string;
  description: string;
  jsonExample: string;
  enabled: boolean;
  onChange: () => Promise<void>;
  isLoading?: boolean;
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <Stack key={id} direction="row" alignItems="center">
      <Switch checked={enabled} onChange={onChange} disabled={isLoading} />
      <IconButton
        aria-owns={open ? "mouse-over-popover" : undefined}
        aria-haspopup="true"
        onMouseEnter={handlePopoverOpen}
        onMouseLeave={handlePopoverClose}
        sx={{ ml: -1 }}
      >
        <HelpOutline />
      </IconButton>
      <Popover
        id="mouse-over-popover"
        sx={{ pointerEvents: "none", ml: 1 }}
        open={open}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: "center",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "center",
          horizontal: "left",
        }}
        onClose={handlePopoverClose}
        disableRestoreFocus
      >
        <Code
          hideFileNameIcon
          fileName={`example: ${description}`}
          hideCopyButton
          value={JSON.stringify(JSON.parse(jsonExample), null, 2)}
          lang="json"
        />
      </Popover>
    </Stack>
  );
};
