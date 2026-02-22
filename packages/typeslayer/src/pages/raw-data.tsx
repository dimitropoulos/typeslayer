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
  ListItem,
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
  useCompilationFiles,
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
import { FormatListNumbered, SvgIconComponent } from "@mui/icons-material";
import { OpenablePath } from "../components/openable-path";

type RawFileKey = "analyze" | "trace" | "types" | "cpu" | "graph";

const RAW_ITEMS: Record<
  RawFileKey,
  {
    route: string;
    label: string;
    description: string;
    usePreview: () => UseQueryResult<string, Error>;
    useValidate: () => UseMutationResult<void, Error, void, unknown>;
    useRegenerate: () => UseMutationResult<unknown, Error, void, unknown>;
    useUpload: () => UseMutationResult<unknown, Error, string, unknown>;
  }
> = {
  analyze: {
    route: "analyze-trace",
    label: ANALYZE_TRACE_FILENAME,
    description:
      "Summary insights extracted from trace.json, including hotspots and duplicate packages.",
    usePreview: useGetAnalyzeTracePreview,
    useValidate: useValidateAnalyzeTrace,
    useRegenerate: useGenerateAnalyzeTrace,
    useUpload: useUploadAnalyzeTrace,
  },

  trace: {
    route: "trace-json",
    label: TRACE_JSON_FILENAME,
    description:
      "Raw event trace emitted by the TypeScript compiler during type checking.",
    usePreview: useGetTraceJsonPreview,
    useValidate: useValidateTraceJson,
    useRegenerate: useGenerateTrace,
    useUpload: useUploadTrace,
  },

  types: {
    route: "types-json",
    label: TYPES_JSON_FILENAME,
    description: "Resolved types catalog containing metadata for each type id.",
    usePreview: useGetTypesJsonPreview,
    useValidate: useValidateTypesJson,
    useRegenerate: useGenerateTrace,
    useUpload: useUploadTypes,
  },

  cpu: {
    route: "tsc-cpuprofile",
    label: CPU_PROFILE_FILENAME,
    description:
      "V8 CPU profile generated during the TypeScript compilation run.",
    usePreview: useGetCpuProfilePreview,
    useValidate: useValidateCpuProfile,
    useRegenerate: useGenerateCpuProfile,
    useUpload: useUploadAnalyzeTrace,
  },

  graph: {
    route: "type-graph",
    label: TYPE_GRAPH_FILENAME,
    description:
      "Type graph representing relationships between types in the TypeScript project.",
    usePreview: useGetTypeGraphPreview,
    useValidate: useValidateTypeGraph,
    useRegenerate: useGenerateTypeGraph,
    useUpload: useUploadTypeGraph,
  },
};

type CompilationStatsKey = "compilationFiles";

const COMPILATION_STATS_ITEMS = {
  compilationFiles: {
    route: "compilation-files",
    label: "Source Files",
    description:
      "List of source files included in the compilation, in the order TypeScript parsed them.",
  },
};

type PathKey = RawFileKey | CompilationStatsKey;

const NavItem = ({
  label,
  route,
  value,
  selected,
  icon: Icon,
}: {
  label: string;
  route: string;
  value: string | undefined;
  selected: boolean;
  icon: SvgIconComponent;
}) => {
  const navigate = useNavigate();
  const setActive = useCallback(
    (route: string) => {
      navigate({ to: `/raw-data/${route}` });
    },
    [navigate],
  );

  return (
    <ListItemButton selected={selected} onClick={() => setActive(route)}>
      <ListItemIcon sx={{ minWidth: 38 }}>
        <Icon />
      </ListItemIcon>
      <ListItemText primary={label} />
      <Box
        sx={{
          marginLeft: 4,
          fontSize: 13,
          color: t => t.palette.secondary.main,
          fontWeight: "bold",
          fontFamily: "monospace",
        }}
      >
        {value ?? "\u00A0".repeat(5)}
      </Box>
    </ListItemButton>
  );
};

export const RawData = () => {
  const params = useParams({ strict: false });
  const child = (params.fileId as string | undefined) ?? "analyze-trace";
  const { data: fileSizes } = useOutputFileSizes();
  const { data: compilationFiles } = useCompilationFiles();

  const selectedId: PathKey = useMemo(() => {
    const entry = Object.entries({
      ...RAW_ITEMS,
      ...COMPILATION_STATS_ITEMS,
    }).find(([, v]) => v.route === child);
    return (entry?.[0] as PathKey) ?? "analyze";
  }, [child]);

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
        {(Object.keys(RAW_ITEMS) as RawFileKey[]).map(id => (
          <NavItem
            key={id}
            label={RAW_ITEMS[id].label}
            route={RAW_ITEMS[id].route}
            selected={selectedId === id}
            icon={Description}
            value={
              fileSizes
                ? formatBytesSize(fileSizes?.[RAW_ITEMS[id].label])
                : undefined
            }
          />
        ))}

        <ListSubheader>Compilation Stats</ListSubheader>

        {(Object.keys(COMPILATION_STATS_ITEMS) as CompilationStatsKey[]).map(
          id => (
            <NavItem
              key={id}
              label={COMPILATION_STATS_ITEMS[id].label}
              route={COMPILATION_STATS_ITEMS[id].route}
              selected={selectedId === id}
              icon={FormatListNumbered}
              value={
                compilationFiles
                  ? compilationFiles.length.toLocaleString()
                  : undefined
              }
            />
          ),
        )}
      </List>

      {Object.keys(RAW_ITEMS).includes(selectedId) ? (
        <RawDataPane key={selectedId} itemKey={selectedId as RawFileKey} />
      ) : null}

      {selectedId === "compilationFiles" ? <CompilationFilesPane /> : null}
    </Stack>
  );
};

const RawDataPane = ({ itemKey }: { itemKey: RawFileKey }) => {
  const {
    label: filename,
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
    } catch (error) {
      showToast({ message: "Validate failed", severity: "error" });
      console.error(error);
    }
  }, [validate, showToast]);

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

  const onCopyPath = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(absolutePath);
      showToast({
        message: `Path copied to clipboard: ${absolutePath}`,
        severity: "success",
      });
    } catch {
      showToast({ message: "Copy path failed", severity: "error" });
    }
  }, [absolutePath, showToast]);

  const onOpenFile = useCallback(async () => {
    try {
      await invoke<void>("open_file", { path: absolutePath });
    } catch {
      showToast({ message: "Failed to open file", severity: "error" });
    }
  }, [absolutePath, showToast]);

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
          Copy Contents
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

        <Button
          variant="outlined"
          onClick={onCopyPath}
          startIcon={<FileCopy />}
        >
          Copy Path
        </Button>

        <Button
          variant="outlined"
          onClick={onOpenFile}
          startIcon={<FolderOpen />}
        >
          Open File
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

const CompilationFilesPane = () => {
  const { data: compilationFiles } = useCompilationFiles();
  const count = compilationFiles?.length;

  const { label, description } = COMPILATION_STATS_ITEMS.compilationFiles;

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
          <Typography variant="h4">{label}</Typography>
          {count ? (
            <Typography color="textSecondary">
              {count.toLocaleString()} files
            </Typography>
          ) : null}
        </Stack>
        <Typography>{description}</Typography>
      </Stack>

      <Stack>
        <List sx={{ background: "transparent" }}>
          {compilationFiles
            ? compilationFiles.map((path, index) => (
                <ListItem key={path} dense>
                  <Stack sx={{ gap: 2, flexDirection: "row", alignItems: 'baseline' }}>
                    <ListItemText>
                      <InlineCode>
                        {"\u00A0".repeat(
                          count
                            ? String(count).length - String(index + 1).length
                            : 0,
                        )}
                        {index + 1}
                      </InlineCode>
                    </ListItemText>
                    <OpenablePath
                      absolutePath={path}
                      propertyTextStyle={{
                        fontFamily: "monospace",
                        fontSize: "1rem",
                        color: 'primary'
                      }}
                    />
                  </Stack>
                </ListItem>
              ))
            : null}
        </List>
      </Stack>
    </Stack>
  );
};
