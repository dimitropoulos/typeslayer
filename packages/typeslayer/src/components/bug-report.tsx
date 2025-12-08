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
          await invoke("open_file", { path: dirPath });
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
          Submit Bug Report
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
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Describe the bug (required)"
            autoFocus
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Please describe what you were doing when the bug occurred, what you expected to happen, and what actually happened..."
            disabled={isSubmitting}
          />

          <Typography variant="body2" sx={{ my: 2 }}>
            the bug report will contain the following files:
          </Typography>

          <List dense>
            {filesToInclude.map(file => (
              <ListItem key={file.name} sx={{ gap: 1 }}>
                <ListItemIcon>
                  <Description />
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={file.description}
                />
              </ListItem>
            ))}
          </List>

          <Typography variant="body2" sx={{ mt: 2, mb: 2 }}>
            email these files to{" "}
            <InlineCode secondary>{supportEmail}</InlineCode>
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

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error.toString()}
            </Alert>
          )}
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
            Create Bug Report
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
