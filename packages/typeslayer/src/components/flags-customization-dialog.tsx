import { Restore } from "@mui/icons-material";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  useApplyTscProjectFlag,
  useExtraTscFlags,
  useProjectRoot,
  useTscExample,
} from "../hooks/tauri-hooks";
import { Code } from "./code";
import { InlineCode } from "./inline-code";
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
  const { data: projectRoot } = useProjectRoot();
  const { data: tscExample } = useTscExample();
  const { data: applyTscProjectFlag, set: setApplyTscProjectFlag } =
    useApplyTscProjectFlag();

  const handleUpdateFlags = async (value: string) => {
    try {
      await setFlags(value);
    } catch (error) {
      console.error("Failed to update flags:", error);
    }
  };

  const handleResetToDefault = async () => {
    if (defaultFlags) {
      await handleUpdateFlags(defaultFlags);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const target = e.target as HTMLInputElement;
      handleUpdateFlags(target.value);
      target.blur();
    }
  };

  const example = tscExample?.replace(/ --[^\s]+/g, match => ` \\\n  ${match}`);
  const exampleCommand = [
    `${stripPackageJson(projectRoot ?? "/project/root")}`,
    `$ ${example}`,
  ].join("\n");

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Customize TypeScript Compiler Flags</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          these flags are passed to the TypeScript compiler when generating
          traces or CPU profiles
        </Typography>

        <Stack direction="row" gap={2}>
          <TextField
            fullWidth
            label="Extra TSC Flags"
            key={currentFlags} // Force re-render when currentFlags changes
            defaultValue={currentFlags ?? ""}
            sx={{ ".MuiInputBase-input": { fontFamily: "monospace" } }}
            onBlur={e => handleUpdateFlags(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            disabled={isLoading}
          />
          <Button
            onClick={handleResetToDefault}
            disabled={isLoading}
            variant="outlined"
            startIcon={<Restore />}
            sx={{
              whiteSpace: "nowrap",
              flexShrink: 0,
              alignSelf: "end",
            }}
          >
            Reset
          </Button>
        </Stack>

        <FormGroup sx={{ mt: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={applyTscProjectFlag}
                disabled={isLoading}
                onChange={async e => {
                  await setApplyTscProjectFlag(e.target.checked);
                }}
              />
            }
            label={
              <span>
                apply the <InlineCode secondary>--project</InlineCode> flag with
                my <InlineCode secondary>tsconfig</InlineCode>
              </span>
            }
          />
        </FormGroup>

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
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
