import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useExtraTscFlags } from "../hooks/tauri-hooks";

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

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Customize TypeScript Compiler Flags</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          These flags are passed to the TypeScript compiler when generating
          traces or CPU profiles.
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
