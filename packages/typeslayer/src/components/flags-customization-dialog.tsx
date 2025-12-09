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
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback } from "react";
import {
  useApplyTscProjectFlag,
  useExtraTscFlags,
  useMaxOldSpaceSize,
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

const maxOldSpaceSizeOptions = [512, 1024, 2048, 4096, 8192, 16384];

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

  const {
    data: maxOldSpaceSize,
    set: setMaxOldSpaceSize,
    isLoading: maxOldSpaceSizeIsLoading,
  } = useMaxOldSpaceSize();

  const maxOldSpaceSizeEnabled = Boolean(maxOldSpaceSize);
  const toggleMaxOldSpaceSize = (enabled: boolean) => {
    if (enabled) {
      setMaxOldSpaceSize(maxOldSpaceSizeOptions[3]);
    } else {
      setMaxOldSpaceSize(null);
    }
  };

  const handleSelectOldSpaceSize = useCallback(
    async (event: SelectChangeEvent<number>) => {
      await setMaxOldSpaceSize(event.target.value);
    },
    [setMaxOldSpaceSize],
  );

  const handleUpdateFlags = useCallback(
    async (value: string) => {
      try {
        await setFlags(value);
      } catch (error) {
        console.error("Failed to update flags:", error);
      }
    },
    [setFlags],
  );

  const handleResetToDefault = useCallback(async () => {
    if (defaultFlags) {
      await handleUpdateFlags(defaultFlags);
    }
  }, [defaultFlags, handleUpdateFlags]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const target = e.target as HTMLInputElement;
        handleUpdateFlags(target.value);
        target.blur();
      }
    },
    [handleUpdateFlags],
  );

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
                apply the <InlineCode secondary>--project</InlineCode> flag when
                I've selected a <InlineCode secondary>tsconfig</InlineCode>
              </span>
            }
          />
        </FormGroup>

        <FormGroup
          sx={{
            mt: 1,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 2,
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={maxOldSpaceSizeEnabled}
                disabled={maxOldSpaceSizeIsLoading}
                onChange={async e => {
                  toggleMaxOldSpaceSize(e.target.checked);
                }}
              />
            }
            label={"give Node.js extra memory"}
          />

          {maxOldSpaceSizeEnabled ? (
            <Select<number>
              size="small"
              value={maxOldSpaceSize ?? undefined}
              onChange={handleSelectOldSpaceSize}
            >
              {maxOldSpaceSizeOptions.map(size => (
                <MenuItem
                  key={size}
                  value={size}
                  selected={maxOldSpaceSize === size}
                >
                  {size === maxOldSpaceSizeOptions[0]
                    ? `${size} MiB (default)`
                    : `${size} MiB`}
                </MenuItem>
              ))}
            </Select>
          ) : null}
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
