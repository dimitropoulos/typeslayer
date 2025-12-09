import { ContentCopy } from "@mui/icons-material";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback } from "react";
import { BugReport } from "../../components/bug-report";
import { stripAnsi } from "../../components/utils";

const ErrorStreamSection = ({
  title,
  content,
}: {
  title: string;
  content: string;
}) => {
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).catch(err => {
      console.error("Failed to copy to clipboard:", err);
    });
  }, [content]);

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        border: theme => `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1,
          bgcolor: theme => theme.palette.background.paper,
          borderBottom: theme => `1px solid ${theme.palette.divider}`,
          fontSize: 12,
          fontWeight: 600,
          textTransform: "uppercase",
          justifyContent: "space-between",
          display: "flex",
          alignItems: "center",
          letterSpacing: 0.75,
        }}
      >
        {title}
        <IconButton
          size="small"
          onClick={handleCopy}
          title="Copy to clipboard"
          sx={{ ml: 1 }}
        >
          <ContentCopy fontSize="small" />
        </IconButton>
      </Box>
      <Box
        component="pre"
        sx={{
          m: 0,
          px: 2,
          py: 1.5,
          fontFamily: "monospace",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          overflow: "auto",
          maxHeight: 320,
          bgcolor: theme => theme.palette.background.default,
        }}
      >
        {stripAnsi(content)}
      </Box>
    </Box>
  );
};

export const ErrorDialog = ({
  open,
  onClose,
  processingErrorDetails,
  processingErrorStdout,
  processingErrorStderr,
  errorDialogTitle,
  hasStdout,
  hasStderr,
}: {
  open: boolean;
  onClose: () => void;
  processingErrorDetails: string | null;
  processingErrorStdout: string | null;
  processingErrorStderr: string | null;
  errorDialogTitle: string;
  hasStdout: boolean;
  hasStderr: boolean;
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>{errorDialogTitle}</DialogTitle>
      <DialogContent dividers>
        <Stack gap={2}>
          {processingErrorDetails && (
            <Typography color="text.secondary">
              Detailed compiler output collected from the most recent run.
            </Typography>
          )}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <ErrorStreamSection
              title="STDOUT"
              content={
                hasStdout
                  ? (processingErrorStdout ?? "")
                  : "No STDOUT output captured."
              }
            />
            <ErrorStreamSection
              title="STDERR"
              content={
                hasStderr
                  ? (processingErrorStderr ?? "")
                  : "No STDERR output captured."
              }
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <BugReport
          stdout={processingErrorStdout || undefined}
          stderr={processingErrorStderr || undefined}
          fullButton
          onClose={onClose}
        />
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
