import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  useExtraTscFlags,
  useProjectRoot,
  useTscExample,
} from "../hooks/tauri-hooks";
import { Code } from "./code";
import { stripPackageJson } from "./utils";

export type FlagsCustomizationDialogProps = {
  readonly open: boolean;
  readonly onClose: () => void;
};

export function FlagsCustomizationDialog({
  open,
  onClose,
}: FlagsCustomizationDialogProps) {
  const {
    data: currentFlags,
    set: setFlags,
    isLoading,
    defaultFlags,
  } = useExtraTscFlags();
  const [localFlags, setLocalFlags] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { data: projectRoot } = useProjectRoot();
  const { data: tscExample } = useTscExample();

  useEffect(() => {
    if (open && typeof currentFlags === "string") {
      setLocalFlags(currentFlags);
    }
  }, [open, currentFlags]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setFlags(localFlags);
      onClose();
    } catch (error) {
      console.error("Failed to save flags:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (typeof currentFlags === "string") {
      setLocalFlags(currentFlags);
    }
    onClose();
  };

  const handleResetToDefault = () => {
    if (defaultFlags) {
      setLocalFlags(defaultFlags);
    }
  };

  const example = tscExample?.replace(/ --[^\s]+/g, match => ` \\\n  ${match}`);
  const exampleCommand = [
    `${stripPackageJson(projectRoot ?? "/project/root")}`,
    `$ ${example}`,
  ].join("\n");

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Customize TypeScript Compiler Flags</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          these flags are passed to the TypeScript compiler when generating
          traces or CPU profiles
        </Typography>
        <TextField
          fullWidth
          label="Extra TSC Flags"
          value={localFlags}
          sx={{ ".MuiInputBase-input": { fontFamily: "monospace" } }}
          onChange={e => setLocalFlags(e.target.value)}
          autoFocus
          disabled={isLoading}
        />

        <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>
          Example
        </Typography>
        <Stack sx={{ gap: 2 }}>
          <Typography>
            these flags will be used in a command like this:
          </Typography>

          <Code value={exampleCommand} lang="bash" />

          <Typography>
            so if you wanna try it yourself, please feel free!
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleResetToDefault} disabled={isSaving || isLoading}>
          Reset to Default
        </Button>
        <Button onClick={handleClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
