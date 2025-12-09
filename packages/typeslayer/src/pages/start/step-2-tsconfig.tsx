import { Flag } from "@mui/icons-material";
import {
  Box,
  IconButton,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback, useState } from "react";
import { FlagsCustomizationDialog } from "../../components/flags-customization-dialog";
import { InlineCode } from "../../components/inline-code";
import { useSelectedTsconfig, useTsconfigPaths } from "../../hooks/tauri-hooks";
import { Step } from "./step";

export const Step2Tsconfig = () => {
  const selectedTsconfig = useSelectedTsconfig();
  const tsconfigPaths = useTsconfigPaths();
  const [isFlagsDialogOpen, setIsFlagsDialogOpen] = useState(false);

  const onTsconfigChange = useCallback(
    async (event: SelectChangeEvent<string>) => {
      const newTsconfigPath = event.target.value;
      await selectedTsconfig.set(newTsconfigPath);
    },
    [selectedTsconfig.set],
  );

  return (
    <Step step={2}>
      <Stack direction="row" gap={2}>
        <Stack gap={1} sx={{ width: "100%" }}>
          <Typography>
            select the <InlineCode secondary>tsconfig.json</InlineCode> to use
            for type checking (TypeSlayer will run{" "}
            <InlineCode secondary>tsc</InlineCode> with it)
          </Typography>

          <Select
            value={selectedTsconfig.data ?? ""}
            onChange={onTsconfigChange}
            displayEmpty
            sx={{ maxWidth: 800 }}
            renderValue={selected => {
              if (!selected) {
                return (
                  <Stack>
                    <Typography>&lt;no tsconfig&gt;</Typography>
                    <Typography
                      variant="caption"
                      fontFamily="monospace"
                      color="textSecondary"
                    >
                      run <InlineCode secondary>tsc</InlineCode> without the{" "}
                      <InlineCode secondary>--project</InlineCode> flag
                    </Typography>
                  </Stack>
                );
              }
              // Extract just the filename for display
              const filename = selected.split("/").pop() || selected;
              return (
                <Stack>
                  <Typography>{filename}</Typography>
                  <Typography
                    variant="caption"
                    fontFamily="monospace"
                    color="textSecondary"
                  >
                    {selected}
                  </Typography>
                </Stack>
              );
            }}
          >
            <MenuItem value="">
              <Stack>
                <Typography>&lt;no tsconfig&gt;</Typography>
                <Typography
                  variant="caption"
                  fontFamily="monospace"
                  color="textSecondary"
                >
                  run <InlineCode secondary>tsc</InlineCode> without the{" "}
                  <InlineCode secondary>--project</InlineCode> flag
                </Typography>
              </Stack>
            </MenuItem>
            {(tsconfigPaths.data ?? []).map(path => {
              const filename = path.split("/").pop() || path;
              return (
                <MenuItem key={path} value={path}>
                  <Stack>
                    <Typography>{filename}</Typography>
                    <Typography
                      variant="caption"
                      fontFamily="monospace"
                      color="textSecondary"
                    >
                      {path}
                    </Typography>
                  </Stack>
                </MenuItem>
              );
            })}
          </Select>
        </Stack>
        <Box sx={{ alignSelf: "flex-end" }}>
          <IconButton
            onClick={() => setIsFlagsDialogOpen(true)}
            title="Customize Compiler Flags"
            sx={{ mb: 1.125 }}
          >
            <Flag fontSize="large" sx={{ minWidth: 25 }} />
          </IconButton>
          <FlagsCustomizationDialog
            open={isFlagsDialogOpen}
            onClose={() => setIsFlagsDialogOpen(false)}
          />
        </Box>
      </Stack>
    </Step>
  );
};
