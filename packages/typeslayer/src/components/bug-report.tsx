import BugReportIcon from "@mui/icons-material/BugReport";
import ContentCopy from "@mui/icons-material/ContentCopy";
import Description from "@mui/icons-material/Description";
import FolderOpen from "@mui/icons-material/FolderOpen";
import Upload from "@mui/icons-material/Upload";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { InlineCode } from "@typeslayer/common";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../contexts/toast-context";
import { useBugReportFiles, useCreateBugReport } from "../hooks/tauri-hooks";
import { CenterLoader } from "./center-loader";
import { detectPlatformSlash } from "./utils";

const supportEmail = "typeslayer@dimitrimitropoulos.com";

export const BugReport = ({
  stdout,
  stderr,
  fullButton,
  onClose: onCloseCallback,
}: {
  stdout?: string;
  stderr?: string;
  fullButton?: boolean;
  onClose?: () => void;
} = {}) => {
  const [isOpen, setIsOpen] = useState(false);

  const [selectedTab, setSelectedTab] = useState<"create" | "upload">("create");

  const changeTabs = useCallback(
    (_event: React.SyntheticEvent, newValue: "create" | "upload") => {
      setSelectedTab(newValue);
    },
    [],
  );

  const onClose = useCallback(() => {
    setIsOpen(false);
    onCloseCallback?.();
  }, [onCloseCallback]);

  return (
    <>
      {fullButton ? (
        <Button
          onClick={() => setIsOpen(true)}
          startIcon={<BugReportIcon />}
          variant="contained"
        >
          Create Bug Report
        </Button>
      ) : (
        <IconButton title="report a bug" onClick={() => setIsOpen(true)}>
          <BugReportIcon />
        </IconButton>
      )}

      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              background: "#000000a0",
            },
          },
        }}
        fullWidth
      >
        <Tabs onChange={changeTabs} value={selectedTab}>
          <Tab value="create" label="Create A Bug Report" />
          <Tab value="upload" label="Upload A Bug Report" />
        </Tabs>

        {selectedTab === "upload" ? (
          <UploadABugReport onClose={onClose} />
        ) : (
          <CreateABugReport stdout={stdout} stderr={stderr} onClose={onClose} />
        )}
      </Dialog>
    </>
  );
};

const CreateABugReport = ({
  stdout,
  stderr,
  onClose,
}: {
  stdout?: string;
  stderr?: string;
  onClose: () => void;
}) => {
  const { submit, isSubmitting, error } = useCreateBugReport();
  const { data: baseFiles } = useBugReportFiles();
  const [description, setDescription] = useState("");
  const { showToast } = useToast();

  const filesToInclude = useMemo(() => {
    const files = [...(baseFiles || [])];

    if (stdout) {
      files.push({
        name: "stdout.txt",
        description: "Compiler standard output",
      });
    }

    if (stderr) {
      files.push({ name: "stderr.txt", description: "Compiler error output" });
    }

    return files;
  }, [baseFiles, stdout, stderr]);

  const handleSubmit = async () => {
    if (!description.trim()) {
      return;
    }

    try {
      const zipPath = await submit({ description, stdout, stderr });
      setDescription("");
      onClose();

      // Show success toast with open folder action
      const handleOpenContainingDirectory = async () => {
        try {
          // Get the directory path from the file path
          const dirPath = zipPath.substring(
            0,
            Math.max(zipPath.lastIndexOf("/"), zipPath.lastIndexOf("\\")),
          );
          await invoke<void>("open_file", { path: dirPath });
        } catch (err) {
          console.error("Failed to open directory:", err);
        }
      };

      showToast({
        message: `Bug report downloaded to: ${zipPath.split(detectPlatformSlash()).pop()}`,
        severity: "success",
        duration: 10_000,
        action: {
          label: "Open Folder",
          icon: <FolderOpen />,
          onClick: handleOpenContainingDirectory,
        },
      });
    } catch (err) {
      console.error("Failed to create bug report:", err);
    }
  };

  return (
    <>
      <DialogContent dividers>
        <Stack gap={2}>
          <TextField
            fullWidth
            multiline
            rows={2}
            label={`Describe the bug${description ? "" : " (required)"}`}
            autoFocus
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Please describe what you were doing when the bug occurred, what you expected to happen, and what actually happened..."
            disabled={isSubmitting}
          />

          <Typography variant="body2">
            clicking "Create Bug Report" will create a zip file containing these
            files:
          </Typography>

          <List dense sx={{ backgroundColor: "transparent" }}>
            {filesToInclude.map(file => (
              <ListItem
                key={file.name}
                sx={{ gap: 1, "&:hover": { backgroundColor: "black" } }}
              >
                <ListItemIcon>
                  <Description />
                </ListItemIcon>
                <ListItemText
                  primary={<InlineCode>{file.name}</InlineCode>}
                  secondary={file.description}
                  sx={{
                    m: 0,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                />
              </ListItem>
            ))}
          </List>

          <Alert severity="info">
            <Typography variant="body2" gutterBottom>
              (to protect your privacy) the bug report zip will{" "}
              <strong>not</strong> be uploaded anywhere automatically: you will
              need to sent it to me manually.
            </Typography>

            <Typography variant="body2">
              you can email it to <InlineCode>{supportEmail}</InlineCode>
              <IconButton
                size="small"
                onClick={async () => {
                  await navigator.clipboard.writeText(supportEmail);
                }}
                sx={{ ml: 1 }}
                title="Copy email to clipboard"
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Typography>
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error.toString()}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting || !description.trim()}
          loading={isSubmitting}
        >
          Zip and Download Locally
        </Button>
      </DialogActions>
    </>
  );
};

const UploadABugReport = ({ onClose }: { onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleUploadBugReport = useCallback(
    async (filePath: string) => {
      setIsUploading(true);
      try {
        await invoke<void>("upload_bug_report", { zipPath: filePath });
        showToast({
          message: "Bug report uploaded and restored successfully",
          severity: "success",
        });
        onClose();
        // invalidate all queries
        queryClient.invalidateQueries();
      } catch (err) {
        console.error("Failed to upload bug report:", err);
        setUploadError(err?.toString() || "Unknown error");
      } finally {
        setIsUploading(false);
      }
    },
    [showToast, onClose, queryClient],
  );

  const handleFileSelect = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Bug Report",
            extensions: ["zip"],
          },
        ],
      });

      if (selected) {
        console.log("Selected file:", selected);
        await handleUploadBugReport(selected);
      }
    } catch (err) {
      console.error("Failed to select file:", err);
      setUploadError(err?.toString() || "Failed to select file");
    }
  }, [handleUploadBugReport]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    getCurrentWindow()
      .onDragDropEvent(event => {
        const { type } = event.payload;
        switch (type) {
          case "enter":
          case "over":
            setIsDragging(true);
            break;

          case "drop": {
            setIsDragging(false);
            const zipFile = event.payload.paths.find(path =>
              path.endsWith(".zip"),
            );

            if (zipFile) {
              // In Tauri, we need to get the file path from the dropped file
              // This requires the file to be saved somewhere accessible
              console.log(zipFile);
              const filePath = zipFile;
              if (filePath) {
                handleUploadBugReport(filePath);
              } else {
                setUploadError(`Failed to get file path ${zipFile}`);
              }
            } else {
              showToast({
                message: "Please drop a .zip bug report file",
                severity: "warning",
              });
            }
            break;
          }

          case "leave":
            setIsDragging(false);
            break;

          default:
            event.payload satisfies never;
            break;
        }
      })
      .then(fn => {
        unlisten = fn;
      });

    return () => {
      unlisten?.();
    };
  }, [handleUploadBugReport, showToast]);

  return (
    <>
      <DialogContent dividers>
        <Box
          sx={{
            border: "2px dashed",
            borderColor: isDragging ? "primary.main" : "divider",
            borderRadius: 1,
            height: 365,
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            px: 3,
            textAlign: "center",
            backgroundColor: isDragging ? "action.hover" : "transparent",
            transition: "all 0.2s",
            cursor: "pointer",
          }}
          onClick={handleFileSelect}
        >
          {isUploading ? (
            <CenterLoader />
          ) : (
            <>
              <Upload
                sx={{
                  opacity: 0.25,
                  height: "80px",
                  width: "80px",
                  color: "text.secondary",
                  mb: 2,
                }}
              />
              <Typography gutterBottom>
                Drop a bug report <InlineCode>.zip</InlineCode> file here to
                restore
              </Typography>
              <Typography variant="body2" color="text.secondary">
                (or click to select a file)
              </Typography>
            </>
          )}
        </Box>
        {uploadError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {uploadError}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </>
  );
};
