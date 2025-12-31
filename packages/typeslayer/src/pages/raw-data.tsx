import Autorenew from "@mui/icons-material/Autorenew";
import Description from "@mui/icons-material/Description";
import Download from "@mui/icons-material/Download";
import FileCopy from "@mui/icons-material/FileCopy";
import FileUpload from "@mui/icons-material/FileUpload";
import FolderOpen from "@mui/icons-material/FolderOpen";
import VerifiedUser from "@mui/icons-material/VerifiedUser";
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
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { downloadDir } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { download } from "@tauri-apps/plugin-upload";
import { ANALYZE_TRACE_FILENAME } from "@typeslayer/analyze-trace/browser";
import { InlineCode } from "@typeslayer/common";
import {
  CPU_PROFILE_FILENAME,
  TRACE_JSON_FILENAME,
  TYPES_JSON_FILENAME,
} from "@typeslayer/validate";
import { useCallback, useMemo } from "react";
import { CenterLoader } from "../components/center-loader";
import { Code } from "../components/code";
import {
  detectPlatformSlash,
  formatBytesSize,
  serverBaseUrl,
} from "../components/utils";
import { type ToastData, useToast } from "../contexts/toast-context";
import {
  useDataDir,
  useGenerateAnalyzeTrace,
  useGenerateCpuProfile,
  useGenerateTrace,
  useGenerateTypeGraph,
  useGetAnalyzeTracePreview,
  useGetCpuProfilePreview,
  useGetTraceJsonPreview,
  useGetTypeGraphPreview,
  useGetTypesJsonPreview,
  useOutputFileSizes,
  useUploadAnalyzeTrace,
  useUploadTrace,
  useUploadTypeGraph,
  useUploadTypes,
  useValidateAnalyzeTrace,
  useValidateCpuProfile,
  useValidateTraceJson,
  useValidateTypeGraph,
  useValidateTypesJson,
} from "../hooks/tauri-hooks";
import { TYPE_GRAPH_FILENAME } from "../types/type-graph";

type RawKey = "analyze" | "trace" | "types" | "cpu" | "graph";

const RAW_ITEMS: Record<
  RawKey,
  {
    route: string;
    filename: string;
    description: string;
    usePreview: () => UseQueryResult<string, Error>;
    useValidate: () => UseMutationResult<void, Error, void, unknown>;
    useRegenerate: () => UseMutationResult<unknown, Error, void, unknown>;
    useUpload: () => UseMutationResult<unknown, Error, string, unknown>;
  }
> = {
  analyze: {
    route: "analyze-trace",
    filename: ANALYZE_TRACE_FILENAME,
    description:
      "Summary insights extracted from trace.json, including hotspots and duplicate packages.",
    usePreview: useGetAnalyzeTracePreview,
    useValidate: useValidateAnalyzeTrace,
    useRegenerate: useGenerateAnalyzeTrace,
    useUpload: useUploadAnalyzeTrace,
  },

  trace: {
    route: "trace-json",
    filename: TRACE_JSON_FILENAME,
    description:
      "Raw event trace emitted by the TypeScript compiler during type checking.",
    usePreview: useGetTraceJsonPreview,
    useValidate: useValidateTraceJson,
    useRegenerate: useGenerateTrace,
    useUpload: useUploadTrace,
  },

  types: {
    route: "types-json",
    filename: TYPES_JSON_FILENAME,
    description: "Resolved types catalog containing metadata for each type id.",
    usePreview: useGetTypesJsonPreview,
    useValidate: useValidateTypesJson,
    useRegenerate: useGenerateTrace,
    useUpload: useUploadTypes,
  },

  cpu: {
    route: "tsc-cpuprofile",
    filename: CPU_PROFILE_FILENAME,
    description:
      "V8 CPU profile generated during the TypeScript compilation run.",
    usePreview: useGetCpuProfilePreview,
    useValidate: useValidateCpuProfile,
    useRegenerate: useGenerateCpuProfile,
    useUpload: useUploadAnalyzeTrace,
  },

  graph: {
    route: "type-graph",
    filename: TYPE_GRAPH_FILENAME,
    description:
      "Type graph representing relationships between types in the TypeScript project.",
    usePreview: useGetTypeGraphPreview,
    useValidate: useValidateTypeGraph,
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
          minWidth: 320,
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
  const {
    filename,
    description,
    useValidate,
    useRegenerate,
    useUpload,
    usePreview,
  } = RAW_ITEMS[itemKey];
  const { mutateAsync: regenerate, isPending: isRegenerating } =
    useRegenerate();
  const { mutateAsync: upload, isPending: isUploading } = useUpload();
  const { data: preview, isLoading: previewIsLoading } = usePreview();
  const { data: fileSizes } = useOutputFileSizes();
  const validate = useValidate();
  const { showToast: showToastOriginal } = useToast();
  const showToast = useCallback(
    (toastData: ToastData) => {
      showToastOriginal({
        ...toastData,
        anchorOrigin: { vertical: "top", horizontal: "center" },
      });
    },
    [showToastOriginal],
  );
  const dataDir = useDataDir();

  const onCopy = useCallback(async () => {
    if (!preview) {
      return;
    }
    try {
      await navigator.clipboard.writeText(preview);
      showToast({
        message: "Copied to clipboard",
        severity: "success",
      });
    } catch {
      showToast({ message: "Copy failed", severity: "error" });
    }
  }, [preview, showToast]);

  const onDownload = useCallback(async () => {
    try {
      const base = await downloadDir();
      const platformSlash = detectPlatformSlash();
      const dest = `${base}${base.endsWith(platformSlash) ? "" : platformSlash}${filename}`;
      const url = `${serverBaseUrl}/outputs/${filename}`;
      await download(url, dest);

      const handleOpenFile = async () => {
        try {
          await invoke<void>("open_file", { path: dest });
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

  const onValidate = useCallback(async () => {
    try {
      await validate.mutateAsync();
      showToast({ message: "Verified: OK", severity: "success" });
    } catch (_e) {
      showToast({ message: "Validate failed", severity: "error" });
    }
  }, [validate.mutateAsync, showToast]);

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

  const absolutePath = `${dataDir.data ?? ""}/outputs/${filename}`;

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

      <Stack sx={{ gap: 1, flexDirection: "row", flexWrap: "wrap" }}>
        <Button
          variant="outlined"
          onClick={onValidate}
          startIcon={<VerifiedUser />}
          loading={validate.isPending}
        >
          Validate
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

      {previewIsLoading ? (
        <Box
          sx={{
            backgroundColor: "background.paper",
          }}
        >
          <CenterLoader />
        </Box>
      ) : preview && typeof preview === "string" ? (
        <Code
          value={preview}
          openableFilename
          maxSize={1024 * 100 - 1}
          fileName={absolutePath}
        />
      ) : (
        <Alert severity="error">File not found.</Alert>
      )}
    </Stack>
  );
};
