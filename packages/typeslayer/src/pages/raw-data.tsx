import {
  Autorenew,
  Description,
  Download,
  FileCopy,
  FileUpload,
  FolderOpen,
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
  Stack,
  Typography,
} from "@mui/material";
import type { UseMutationResult } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { downloadDir } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { download } from "@tauri-apps/plugin-upload";
import { ANALYZE_TRACE_FILENAME } from "@typeslayer/analyze-trace/browser";
import {
  CPU_PROFILE_FILENAME,
  TRACE_JSON_FILENAME,
  TYPES_JSON_FILENAME,
} from "@typeslayer/validate";
import { useCallback, useMemo } from "react";
import { CenterLoader } from "../components/center-loader";
import { Code } from "../components/code";
import { InlineCode } from "../components/inline-code";
import {
  formatBytesSize,
  serverBaseUrl,
  useStaticFile,
} from "../components/utils";
import { useToast } from "../contexts/toast-context";
import {
  useGenerateAnalyzeTrace,
  useGenerateCpuProfile,
  useGenerateTrace,
  useGenerateTypeGraph,
  useOutputFileSizes,
  useUploadAnalyzeTrace,
  useUploadTrace,
  useUploadTypeGraph,
  useUploadTypes,
} from "../hooks/tauri-hooks";
import { TYPE_GRAPH_FILENAME } from "../types/type-graph";

type RawKey = "analyze" | "trace" | "types" | "cpu" | "graph";

const RAW_ITEMS: Record<
  RawKey,
  {
    route: string;
    filename: string;
    description: string;
    verifyInvoke: string;
    useRegenerate: () => UseMutationResult<unknown, Error, void, unknown>;
    useUpload: () => UseMutationResult<unknown, Error, string, unknown>;
  }
> = {
  analyze: {
    route: "analyze-trace",
    filename: ANALYZE_TRACE_FILENAME,
    description:
      "Summary insights extracted from trace.json, including hotspots and duplicate packages.",
    verifyInvoke: "verify_analyze_trace",
    useRegenerate: useGenerateAnalyzeTrace,
    useUpload: useUploadAnalyzeTrace,
  },

  trace: {
    route: "trace-json",
    filename: TRACE_JSON_FILENAME,
    description:
      "Raw event trace emitted by the TypeScript compiler during type checking.",
    verifyInvoke: "validate_trace_json",
    useRegenerate: useGenerateTrace,
    useUpload: useUploadTrace,
  },

  types: {
    route: "types-json",
    filename: TYPES_JSON_FILENAME,
    description: "Resolved types catalog containing metadata for each type id.",
    verifyInvoke: "validate_types_json",
    useRegenerate: useGenerateTrace,
    useUpload: useUploadTypes,
  },

  cpu: {
    route: "tsc-cpuprofile",
    filename: CPU_PROFILE_FILENAME,
    description:
      "V8 CPU profile generated during the TypeScript compilation run.",
    verifyInvoke: "verify_cpu_profile",
    useRegenerate: useGenerateCpuProfile,
    useUpload: useUploadAnalyzeTrace,
  },

  graph: {
    route: "type-graph",
    filename: TYPE_GRAPH_FILENAME,
    description:
      "Type graph representing relationships between types in the TypeScript project.",
    verifyInvoke: "verify_type_graph",
    useRegenerate: useGenerateTypeGraph,
    useUpload: useUploadTypeGraph,
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
            <ListItemText primary={RAW_ITEMS[key].filename} />
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
                ? formatBytesSize(fileSizes[RAW_ITEMS[key].filename])
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
  const { filename, description, verifyInvoke, useRegenerate, useUpload } =
    RAW_ITEMS[itemKey];
  const { mutateAsync: regenerate, isPending: isRegenerating } =
    useRegenerate();
  const { mutateAsync: upload, isPending: isUploading } = useUpload();
  const { data: text, isLoading } = useStaticFile(filename);
  const { data: fileSizes } = useOutputFileSizes();
  const { showToast } = useToast();

  const onCopy = useCallback(async () => {
    if (!text) {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast({
        message: "Copied to clipboard",
        severity: "success",
      });
    } catch {
      showToast({ message: "Copy failed", severity: "error" });
    }
  }, [text, showToast]);

  const onDownload = useCallback(async () => {
    try {
      const base = await downloadDir();
      const dest = `${base}${base.endsWith("/") ? "" : "/"}${filename}`;
      const url = `${serverBaseUrl}/outputs/${filename}`;
      await download(url, dest);

      const handleOpenFile = async () => {
        try {
          await invoke("open_file", { path: dest });
        } catch {
          showToast({ message: "Failed to open file", severity: "error" });
        }
      };

      showToast({
        message: `Downloaded to: ${dest}`,
        severity: "success",
        action: {
          label: "Open",
          icon: <FolderOpen />,
          onClick: handleOpenFile,
        },
      });
    } catch {
      showToast({ message: "Download failed", severity: "error" });
    }
  }, [filename, showToast]);

  const onVerify = useCallback(async () => {
    try {
      await invoke(verifyInvoke);
      showToast({ message: "Verified: OK", severity: "success" });
    } catch (_e) {
      showToast({ message: "Verify failed", severity: "error" });
    }
  }, [verifyInvoke, showToast]);

  const fileSize = fileSizes ? fileSizes[filename] : null;

  const uploadFile = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: filename, extensions: ["json"] }],
      });
      if (!selected || Array.isArray(selected)) {
        return;
      }
      await upload(selected);
      showToast({ message: `Uploaded: ${selected}`, severity: "success" });
    } catch {
      showToast({ message: "Upload failed", severity: "error" });
    }
  }, [upload, showToast, filename]);

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
            <InlineCode>{filename}</InlineCode>
          </Typography>
          {fileSize ? (
            <Typography color="textSecondary">
              {fileSize.toLocaleString()} bytes
            </Typography>
          ) : null}
        </Stack>
        <Typography>{description}</Typography>
      </Stack>

      <Stack direction="row" gap={2}>
        <Button
          variant="outlined"
          onClick={onVerify}
          startIcon={<VerifiedUser />}
        >
          Verify
        </Button>

        <Button
          variant="outlined"
          onClick={() => regenerate()}
          startIcon={<Autorenew />}
          loading={isRegenerating}
        >
          Regenerate
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

        <Button
          variant="outlined"
          onClick={uploadFile}
          startIcon={<FileUpload />}
          loading={isUploading}
        >
          Upload
        </Button>
      </Stack>

      {isLoading ? (
        <Box
          sx={{
            backgroundColor: "background.paper",
          }}
        >
          <CenterLoader />
        </Box>
      ) : text && typeof text === "string" ? (
        <Code value={text} />
      ) : (
        <Alert severity="error">File not found.</Alert>
      )}
    </Stack>
  );
};
