import InfoOutline from "@mui/icons-material/InfoOutline";
import Restore from "@mui/icons-material/Restore";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { InlineCode } from "@typeslayer/common";
import { useCallback } from "react";
import {
  useApplyTscProjectFlag,
  useExtraTscFlags,
  useMaxOldSpaceSize,
  useMaxStackSize,
  useProjectRoot,
  useTscExample,
  useTypeScriptCompilerVariant,
} from "../hooks/tauri-hooks";
import { Code } from "./code";
import {
  formatBytesSize,
  processTscExample,
  type TypeScriptCompilerVariant,
  typeScriptCompilerVariants,
} from "./utils";

export type FlagsCustomizationDialogProps = {
  readonly open: boolean;
  readonly onClose: () => void;
};

const kibibyte = 1024;
const mibibyte = 1024 * kibibyte;

/** in MiB */
const maxOldSpaceSizeOptions = [
  { value: 512, label: "" },
  { value: 1024, label: "" },
  { value: 2048, label: "(the Node.js default)" }, // https://github.com/nodejs/node/blob/main/deps/v8/src/heap/heap.cc#L415-L417
  { value: 4096, label: "" },
  { value: 8192, label: "" },
  { value: 12288, label: "(bro..)" },
  { value: 16384, label: "(BRO.)" },
  { value: 24576, label: "(!?!?!)" },
  { value: 32768, label: "(time to get a new CTO)" },
  { value: 49152, label: "(burn this thing down to bedrock)" },
  { value: 65535, label: "(voids your TypeScript warranty)" },
];

/** in KiB */
const maxStackSizeOptions = [
  { value: 512, label: "" },
  { value: 984, label: "(the Node.js default)" },
  {
    value: 2048,
    label:
      "(the fact that you have to do this at all is sorta concerning, tbh)",
  },
  { value: 4096, label: "(why wasn't doubling the default enough?? srsly?)" },
  {
    value: 16384,
    label: "(looks like someone's getting a segfault for Christmas.)",
  },
];

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

  const { data: typescriptCompilerVariant, set: setTypeScriptCompilerVariant } =
    useTypeScriptCompilerVariant();

  const {
    data: maxOldSpaceSize,
    set: setMaxOldSpaceSize,
    isLoading: maxOldSpaceSizeIsLoading,
  } = useMaxOldSpaceSize();

  const maxOldSpaceSizeEnabled = Boolean(maxOldSpaceSize);
  const toggleMaxOldSpaceSize = (enabled: boolean) => {
    if (enabled) {
      setMaxOldSpaceSize(maxOldSpaceSizeOptions[3].value);
    } else {
      setMaxOldSpaceSize(null);
    }
  };

  const handleSelectMaxOldStackSize = useCallback(
    async (event: SelectChangeEvent<number>) => {
      await setMaxOldSpaceSize(event.target.value);
    },
    [setMaxOldSpaceSize],
  );

  const {
    data: maxStackSize,
    set: setMaxStackSize,
    isLoading: maxStackSizeIsLoading,
  } = useMaxStackSize();

  const maxStackSizeEnabled = Boolean(maxStackSize);
  const toggleMaxStackSize = (enabled: boolean) => {
    if (enabled) {
      setMaxStackSize(maxStackSizeOptions[2].value);
    } else {
      setMaxStackSize(null);
    }
  };

  const handleSelectMaxStackSize = useCallback(
    async (event: SelectChangeEvent<number>) => {
      await setMaxStackSize(event.target.value);
    },
    [setMaxStackSize],
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            background: "#000000a0",
          },
        },
      }}
    >
      <DialogTitle>Customize TypeScript Compiler Flags</DialogTitle>
      <DialogContent dividers>
        <FormControl
          error={typescriptCompilerVariant === "tsgo"}
          sx={{ mb: 2 }}
        >
          <InputLabel id="typescript-compiler-variant-label">
            TypeScript Compiler
          </InputLabel>
          <Select
            labelId="typescript-compiler-variant-label"
            value={typescriptCompilerVariant}
            onChange={async e => {
              await setTypeScriptCompilerVariant(
                e.target.value as TypeScriptCompilerVariant,
              );
            }}
            size="small"
            disabled={isLoading}
          >
            {typeScriptCompilerVariants.map(variant => (
              <MenuItem key={variant} value={variant}>
                <InlineCode>{variant}</InlineCode>
              </MenuItem>
            ))}
          </Select>

          {typescriptCompilerVariant === "tsgo" ? (
            <FormHelperText>
              I'm not gonna stop you, but just so you know: at the time of this
              version of TypeSlayer, <InlineCode>tsgo</InlineCode> doesn't yet
              have the capability to generate the trace files required to make
              TypeSlayer do its slaying. you're free to try, but please don't
              report when it doesn't work - the flags literally aren't
              implemented yet.
            </FormHelperText>
          ) : null}
        </FormControl>

        <Stack sx={{ flexDirection: "row", gap: 2, mt: 1, mb: 3 }}>
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
            slotProps={{
              inputLabel: {
                sx: {
                  mb: 0,
                },
              },
            }}
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

        <FormGroup sx={{ my: 1 }}>
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
                apply the <InlineCode>--project</InlineCode> flag when I've
                selected a <InlineCode>tsconfig</InlineCode>
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
              onChange={handleSelectMaxOldStackSize}
              sx={{ "& .MuiSelect-select": { py: "3px !important" } }}
            >
              {maxOldSpaceSizeOptions.map(({ value, label }) => (
                <MenuItem
                  key={value}
                  value={value}
                  selected={maxOldSpaceSize === value}
                >
                  {`${formatBytesSize(value * mibibyte)} ${label}`}
                </MenuItem>
              ))}
            </Select>
          ) : null}
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
                checked={maxStackSizeEnabled}
                disabled={maxStackSizeIsLoading}
                onChange={async e => {
                  toggleMaxStackSize(e.target.checked);
                }}
              />
            }
            label={"give Node.js a bigger stack"}
          />

          {maxStackSizeEnabled ? (
            <Stack sx={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
              <Tooltip title="TypeSlayer doesn't mess with your system settings, so to actually take advantage of this flag you may first need to use ulimit (or whatever) to increase your system stack size limit.">
                <InfoOutline />
              </Tooltip>
              <Select<number>
                size="small"
                value={maxStackSize ?? undefined}
                onChange={handleSelectMaxStackSize}
                sx={{ "& .MuiSelect-select": { py: "3px !important" } }}
              >
                {maxStackSizeOptions.map(({ value, label }) => (
                  <MenuItem
                    key={value}
                    value={value}
                    selected={maxStackSize === value}
                  >
                    {`${formatBytesSize(value * kibibyte)} ${label}`}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          ) : null}
        </FormGroup>

        <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>
          Example
        </Typography>
        <Stack sx={{ gap: 2 }}>
          <Typography>
            this is literally what TypeSlayer will run. to debug a problem, you
            should start by trying to run it yourself from the same location
          </Typography>

          <Code
            value={processTscExample({
              tscExample,
              projectRoot,
            })}
            copyThisInstead={tscExample}
            lang="bash"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
