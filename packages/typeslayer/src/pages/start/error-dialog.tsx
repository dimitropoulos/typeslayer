import ContentCopy from "@mui/icons-material/ContentCopy";
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
import { ErrorHelper } from "./error-helper";

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
  processingErrorStdout,
  processingErrorStderr,
  processingError,
}: {
  open: boolean;
  onClose: () => void;
  processingErrorStdout: string | null;
  processingErrorStderr: string | null;
  processingError: string | null;
}) => {
  const errorDialogTitle = processingError ?? "Diagnostics failed";

  if (!processingErrorStderr && !processingErrorStdout) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
        <DialogTitle>Internal Error</DialogTitle>
        <DialogContent dividers>
          <ErrorStreamSection
            title="TypeSlayer System Error"
            content={errorDialogTitle}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>Error</DialogTitle>
      <DialogContent dividers>
        <Stack gap={2}>
          <Typography variant="h5">{"TypeSlayer System Error"}</Typography>
          <ErrorHelper
            processingError={errorDialogTitle}
            processingErrorStderr={processingErrorStderr}
            processingErrorStdout={processingErrorStdout}
          />
          {processingErrorStdout ? (
            <ErrorStreamSection
              title="STDOUT"
              content={processingErrorStdout}
            />
          ) : null}
          {processingErrorStderr ? (
            <ErrorStreamSection
              title="STDERR"
              content={processingErrorStderr}
            />
          ) : null}
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
