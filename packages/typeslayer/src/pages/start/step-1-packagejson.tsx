import { Button, Stack, TextField, Typography } from "@mui/material";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useState } from "react";
import { InlineCode } from "../../components/inline-code";
import { useProjectRoot } from "../../hooks/tauri-hooks";
import { Step } from "./step";

export const Step1PackageJson = () => {
  const projectRoot = useProjectRoot();
  const [localProjectRoot, setLocalProjectRoot] = useState<string>("");

  // handle update from server on mount
  useEffect(() => {
    if (localProjectRoot === "" && projectRoot.data) {
      setLocalProjectRoot(projectRoot.data);
    }
  }, [localProjectRoot, projectRoot.data]);

  const applyProjectRoot = useCallback(
    async (pkgPath: string) => {
      // allow the user to type whether or not it's valid
      setLocalProjectRoot(pkgPath);

      try {
        await projectRoot.set(pkgPath);
      } catch (error) {
        console.error("Failed to set project root:", error);
      }
    },
    [projectRoot.set],
  );

  const onChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      await applyProjectRoot(event.target.value);
    },
    [applyProjectRoot],
  );

  const locatePackageJson = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "package.json", extensions: ["json"] }],
      });
      if (selected && typeof selected === "string") {
        // Normalize to package.json path
        let pkgPath = selected;
        if (!pkgPath.endsWith("package.json")) {
          // If it's a directory, append package.json
          if (!pkgPath.endsWith("/")) {
            pkgPath += "/";
          }
          pkgPath += "package.json";
        }
        await applyProjectRoot(pkgPath);
      }
    } catch (error) {
      console.error("Failed to open file picker:", error);
    }
  }, [applyProjectRoot]);

  return (
    <Step step={1}>
      <Stack gap={1} sx={{ width: "100%" }}>
        <Typography>
          locate the <InlineCode>package.json</InlineCode> of the package you'd
          like to investigate
        </Typography>

        <Stack direction="row" gap={1} width="100%">
          <Button onClick={locatePackageJson} variant="outlined">
            Locate
          </Button>
          <TextField
            size="small"
            placeholder="path to package.json"
            variant="outlined"
            value={localProjectRoot}
            onChange={onChange}
            fullWidth
          />
        </Stack>
      </Stack>
    </Step>
  );
};
