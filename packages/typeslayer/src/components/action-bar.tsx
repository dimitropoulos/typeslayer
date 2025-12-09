import { CameraAlt, Help } from "@mui/icons-material";
import {
  Button,
  Dialog,
  DialogActions,
  DialogTitle,
  IconButton,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { type FC, useCallback, useState } from "react";
import { useToast } from "../contexts/toast-context";
import { BugReport } from "./bug-report";
import { MITS_DISCORD } from "./constants";
import { InlineCode } from "./inline-code";

const HelpDialog = () => {
  const [open, setOpen] = useState(false);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>TypeSlayer Help</DialogTitle>
        <Stack sx={{ p: 2, gap: 2 }}>
          <Typography>this is a pretty new thing.</Typography>
          <Typography>
            {" "}
            if you have questions or need help, check out the{" "}
            <InlineCode secondary>#typeslayer</InlineCode> channel on the{" "}
            <Link href={MITS_DISCORD}>Michigan TypeScript Discord</Link> or send
            a bug report: <BugReport onClose={handleClose} />
          </Typography>
        </Stack>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <IconButton title="help" onClick={() => setOpen(true)}>
        <Help />
      </IconButton>
    </>
  );
};

export const ActionBar: FC<{ collapsed: boolean }> = ({ collapsed }) => {
  const { showToast } = useToast();

  const handleScreenshot = async () => {
    try {
      const savedPath = await invoke<string>("take_screenshot");
      showToast({
        message: savedPath
          ? `Screenshot saved to ${savedPath} and copied to clipboard`
          : "Screenshot captured",
        severity: "success",
        duration: 4000,
      });
    } catch (error) {
      showToast({
        message: `Unable to capture screenshot: ${String(error)}`,
        severity: "error",
        duration: 4000,
      });
    }
  };

  return (
    <Stack
      sx={{
        width: "100%",
        justifyContent: "center",
        flexDirection: collapsed ? "column" : "row",
        gap: 0.5,
        "& .MuiIconButton-root": {
          color: t => t.palette.text.secondary,
          "&:hover": {
            color: t => t.palette.text.primary,
          },
        },
      }}
    >
      <IconButton onClick={handleScreenshot} title="take a screenshot">
        <CameraAlt />
      </IconButton>
      <BugReport />
      <HelpDialog />
    </Stack>
  );
};
