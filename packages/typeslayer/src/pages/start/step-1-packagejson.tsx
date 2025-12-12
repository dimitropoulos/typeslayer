import { Button, Stack, TextField, Typography } from "@mui/material";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useState } from "react";
import { InlineCode } from "../../components/inline-code";
import { useProjectRoot } from "../../hooks/tauri-hooks";
import { Step } from "./step";

export const Step1PackageJson = () => {
  const projectRoot = useProjectRoot();
  const [localProjectRoot, setLocalProjectRoot] = useState<string | undefined>(
    undefined,
  );
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (projectRoot.data && !isTyping) {
      setLocalProjectRoot(projectRoot.data);
    }
  }, [projectRoot.data, isTyping]);

  // Debounced project root validation
  useEffect(() => {
    if (!localProjectRoot || localProjectRoot === projectRoot.data) {
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    const timer = setTimeout(async () => {
      try {
        await projectRoot.set(localProjectRoot);
      } catch (error) {
        console.error("Failed to set project root:", error);
      } finally {
        setIsTyping(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localProjectRoot, projectRoot.data, projectRoot.set]);

  const applyProjectRoot = useCallback(
    async (pkgPath: string) => {
      setLocalProjectRoot(pkgPath);
      try {
        await projectRoot.set(pkgPath);
      } catch (error) {
        console.error("Failed to set project root:", error);
        throw error;
      } finally {
        setIsTyping(false);
      }
    },
    [projectRoot.set],
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
            value={localProjectRoot ?? ""}
            onChange={e => {
              setLocalProjectRoot(e.target.value);
            }}
            onKeyDown={async event => {
              if (event.key === "Enter" && localProjectRoot) {
                event.preventDefault();
                try {
                  await applyProjectRoot(localProjectRoot);
                } catch (error) {
                  console.error("Failed to apply project root:", error);
                }
              }
            }}
            fullWidth
          />
        </Stack>
      </Stack>
    </Step>
  );
};
