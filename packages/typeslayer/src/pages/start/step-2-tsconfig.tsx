import { Flag } from "@mui/icons-material";
import {
  Button,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback, useState } from "react";
import { FlagsCustomizationDialog } from "../../components/flags-customization-dialog";
import { InlineCode } from "../../components/inline-code";
import { detectPlatformSlash } from "../../components/utils";
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

  const platformSlash = detectPlatformSlash();

  return (
    <Step step={2}>
      <Stack direction="row" gap={2}>
        <Stack gap={1} sx={{ width: "100%" }}>
          <Typography>
            select the <InlineCode>tsconfig.json</InlineCode> to use for type
            checking (TypeSlayer will run <InlineCode>tsc</InlineCode> with it)
          </Typography>
          <Stack direction="row" gap={1}>
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
                        run <InlineCode>tsc</InlineCode> without the{" "}
                        <InlineCode>--project</InlineCode> flag
                      </Typography>
                    </Stack>
                  );
                }
                // Extract just the filename for display
                const filename =
                  selected.split(platformSlash).pop() || selected;
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
                    run <InlineCode>tsc</InlineCode> without the{" "}
                    <InlineCode>--project</InlineCode> flag
                  </Typography>
                </Stack>
              </MenuItem>
              {(tsconfigPaths.data ?? []).map(path => {
                const filename = path.split(platformSlash).pop() || path;
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
            <Button
              onClick={() => setIsFlagsDialogOpen(true)}
              title="Customize Compiler Flags"
              variant="text"
              startIcon={<Flag fontSize="large" />}
              sx={{ px: 2 }}
            >
              Customize Flags
            </Button>
            <FlagsCustomizationDialog
              open={isFlagsDialogOpen}
              onClose={() => setIsFlagsDialogOpen(false)}
            />
          </Stack>
        </Stack>
      </Stack>
    </Step>
  );
};
