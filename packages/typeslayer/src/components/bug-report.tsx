import {
  BugReport as BugReportIcon,
  ContentCopy,
  Description,
  FolderOpen,
} from "@mui/icons-material";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { useMemo, useState } from "react";
import { useToast } from "../contexts/toast-context";
import { useBugReportFiles, useCreateBugReport } from "../hooks/tauri-hooks";
import { InlineCode } from "./inline-code";

const supportEmail = "typeslayer@dimitrimitropoulos.com";

export const BugReport = ({
  stdout,
  stderr,
  fullButton,
  onClose,
}: {
  stdout?: string;
  stderr?: string;
  fullButton?: boolean;
  onClose?: () => void;
} = {}) => {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const { submit, isSubmitting, error } = useCreateBugReport();
  const { data: baseFiles } = useBugReportFiles();
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
      onClose?.();
      setOpen(false); // Close the dialog

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
        message: `Bug report downloaded to: ${zipPath.split("/").pop()}`,
        severity: "success",
        duration: 10000,
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
      {fullButton ? (
        <Button
          onClick={() => setOpen(true)}
          startIcon={<BugReportIcon />}
          variant="contained"
        >
          Create Bug Report
        </Button>
      ) : (
        <IconButton title="report a bug" onClick={() => setOpen(true)}>
          <BugReportIcon />
        </IconButton>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Bug Report</DialogTitle>

        <DialogContent>
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
              clicking "Create Bug Report" will create a zip file containing
              these files:
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
                <strong>not</strong> be uploaded anywhere automatically: you
                will need to sent it to me manually.
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
          <Button onClick={() => setOpen(false)} disabled={isSubmitting}>
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
      </Dialog>
    </>
  );
};
