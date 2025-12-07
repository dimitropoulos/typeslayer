import {
  Description,
  Download,
  FileCopy,
  VerifiedUser,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { downloadDir } from "@tauri-apps/api/path";
import { download } from "@tauri-apps/plugin-upload";
import { ANALYZE_TRACE_FILENAME } from "@typeslayer/analyze-trace/src/constants";
import {
  CPU_PROFILE_FILENAME,
  TRACE_JSON_FILENAME,
  TYPES_JSON_FILENAME,
} from "@typeslayer/validate";
import { useCallback, useMemo, useState } from "react";
import { Code } from "../components/code";
import { InlineCode } from "../components/inline-code";
import {
  formatFileSize,
  serverBaseUrl,
  useStaticFile,
} from "../components/utils";
import { useOutputFileSizes } from "../hooks/tauri-hooks";
import { TYPE_GRAPH_FILENAME } from "../types/type-graph";

type RawKey = "analyze" | "trace" | "types" | "cpu" | "graph";

const RAW_ITEMS: Record<
  RawKey,
  {
    title: string;
    route: string;
    filename: string;
    description: string;
    verifyInvoke: string;
    fetchInvoke: string;
  }
> = {
  analyze: {
    title: ANALYZE_TRACE_FILENAME,
    route: "analyze-trace",
    filename: ANALYZE_TRACE_FILENAME,
    description:
      "Summary insights extracted from trace.json, including hotspots and duplicate packages.",
    verifyInvoke: "verify_analyze_trace",
    fetchInvoke: "get_analyze_trace_text",
  },
  trace: {
    title: TRACE_JSON_FILENAME,
    route: "trace-json",
    filename: TRACE_JSON_FILENAME,
    description:
      "Raw event trace emitted by the TypeScript compiler during type checking.",
    verifyInvoke: "validate_trace_json",
    fetchInvoke: "get_trace_json_text",
  },
  types: {
    title: TYPES_JSON_FILENAME,
    route: "types-json",
    filename: TYPES_JSON_FILENAME,
    description: "Resolved types catalog containing metadata for each type id.",
    verifyInvoke: "validate_types_json",
    fetchInvoke: "get_types_json_text",
  },

  cpu: {
    title: CPU_PROFILE_FILENAME,
    route: "tsc-cpuprofile",
    filename: CPU_PROFILE_FILENAME,
    description:
      "V8 CPU profile generated during the TypeScript compilation run.",
    verifyInvoke: "verify_cpu_profile",
    fetchInvoke: "get_cpu_profile_text",
  },

  graph: {
    title: TYPE_GRAPH_FILENAME,
    route: "type-graph",
    filename: TYPE_GRAPH_FILENAME,
    description:
      "Type graph representing relationships between types in the TypeScript project.",
    verifyInvoke: "verify_type_graph",
    fetchInvoke: "get_type_graph_text",
  },
};

export const RawData = () => {
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const child = (params.fileId as string | undefined) ?? "analyze-trace";
  const { data: fileSizes } = useOutputFileSizes();

  const currentKey: RawKey = useMemo(() => {
    const entry = Object.entries(RAW_ITEMS).find(([, v]) => v.route === child);
    return (entry?.[0] as RawKey) ?? "analyze";
  }, [child]);

  const setActive = (key: RawKey) => {
    navigate({ to: `/raw-data/${RAW_ITEMS[key].route}` });
  };

  return (
    <Stack direction="row" sx={{ height: "100%" }}>
      <List
        sx={{
          minWidth: 300,
          borderRight: 1,
          borderColor: "divider",
        }}
      >
        <ListSubheader>Raw Data Files</ListSubheader>
        {(Object.keys(RAW_ITEMS) as RawKey[]).map(key => (
          <ListItemButton
            key={key}
            selected={key === currentKey}
            onClick={() => setActive(key)}
          >
            <ListItemIcon sx={{ minWidth: 38 }}>
              <Description />
            </ListItemIcon>
            <ListItemText primary={RAW_ITEMS[key].title} />
            <Box
              sx={{
                marginLeft: 4,
                fontSize: 13,
                color: t => t.palette.secondary.main,
                fontWeight: "bold",
                fontFamily: "monospace",
              }}
            >
              {fileSizes && fileSizes[RAW_ITEMS[key].filename] !== undefined
                ? formatFileSize(fileSizes[RAW_ITEMS[key].filename])
                : "\u00A0".repeat(5)}
            </Box>
          </ListItemButton>
        ))}
      </List>
      <RawDataPane key={currentKey} itemKey={currentKey} />
    </Stack>
  );
};

const RawDataPane = ({ itemKey }: { itemKey: RawKey }) => {
  const item = RAW_ITEMS[itemKey];
  const { data: text, isLoading } = useStaticFile(item.filename);
  const { data: fileSizes } = useOutputFileSizes();

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
    path?: string;
  }>({ open: false, message: "", severity: "success" });

  const onCopy = async () => {
    if (!text) {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setToast({
        open: true,
        message: "Copied to clipboard",
        severity: "success",
      });
    } catch {
      setToast({ open: true, message: "Copy failed", severity: "error" });
    }
  };

  const onDownload = useCallback(async () => {
    try {
      const base = await downloadDir();
      const dest = `${base}${base.endsWith("/") ? "" : "/"}${item.filename}`;
      const url = `${serverBaseUrl}/outputs/${item.filename}`;
      await download(url, dest);
      setToast({
        open: true,
        message: `Downloaded to: ${dest}`,
        severity: "success",
        path: dest,
      });
    } catch {
      setToast({ open: true, message: `Download failed`, severity: "error" });
    }
  }, [item.filename]);

  const onToastClick = useCallback(async () => {
    if (!toast.path) {
      return;
    }
    try {
      await invoke("open_file", { path: toast.path });
    } catch {
      setToast({ open: true, message: "Open failed", severity: "error" });
    }
  }, [toast.path]);

  const onVerify = async () => {
    try {
      await invoke(item.verifyInvoke);
      setToast({ open: true, message: "Verified: OK", severity: "success" });
    } catch (_e) {
      setToast({ open: true, message: "Verify failed", severity: "error" });
    }
  };

  const fileSize = fileSizes ? fileSizes[item.filename] : null;

  return (
    <Stack
      sx={{
        gap: 2,
        flexGrow: 1,
        p: 3,
        overflow: "auto",
      }}
    >
      <Stack gap={1}>
        <Stack sx={{ flexDirection: "row", alignItems: "baseline", gap: 1 }}>
          <Typography variant="h4">
            <InlineCode secondary>{item.title}</InlineCode>
          </Typography>
          {fileSize ? (
            <Typography color="textSecondary">
              {fileSize.toLocaleString()} bytes
            </Typography>
          ) : null}
        </Stack>
        <Typography>{item.description}</Typography>
      </Stack>

      <Stack direction="row" gap={2}>
        <Button
          variant="contained"
          onClick={onVerify}
          startIcon={<VerifiedUser />}
        >
          Verify
        </Button>
        <Button variant="outlined" onClick={onCopy} startIcon={<FileCopy />}>
          Copy
        </Button>
        <Button
          variant="outlined"
          onClick={onDownload}
          startIcon={<Download />}
        >
          Download
        </Button>
      </Stack>

      {isLoading ? (
        <Typography>Loading...</Typography>
      ) : text ? (
        <Code value={text} />
      ) : (
        <Alert severity="info">File not found.</Alert>
      )}
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        open={toast.open}
        onClose={() => setToast(t => ({ ...t, open: false }))}
        autoHideDuration={5000}
      >
        <Alert
          variant="filled"
          severity={toast.severity}
          onClick={onToastClick}
          sx={{ cursor: toast.path ? "pointer" : "default" }}
        >
          {toast.message}
          {toast.path && (
            <Typography
              component="span"
              sx={{ ml: 1, textDecoration: "underline" }}
            >
              Open
            </Typography>
          )}
        </Alert>
      </Snackbar>
    </Stack>
  );
};
