import {
  Stack,
  type SxProps,
  Typography,
  type TypographyVariant,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";
import { useProjectRoot, useRelativePaths } from "../hooks/tauri-hooks";
import { friendlyPath } from "./utils";

export const propertyTextStyle = {
  fontFamily: "monospace",
  fontSize: "0.9rem",
};

export function OpenablePath({
  absolutePath,
  line,
  character,
  title,
  pathVariant = "body1",
  forceAbsolute,
  propertyTextStyle = {},
}: {
  absolutePath: string;
  line?: number;
  character?: number;
  title?: string;
  pathVariant?: TypographyVariant;
  forceAbsolute?: boolean;
  propertyTextStyle?: SxProps | undefined;
}) {
  const relativePaths = useRelativePaths();
  const projectRoot = useProjectRoot();
  const findInPage = useCallback(async () => {
    try {
      const goto =
        line !== undefined && character !== undefined
          ? `${absolutePath}:${line}:${character}`
          : absolutePath;
      console.log("Opening file via backend:", goto);
      await invoke<void>("open_file", { path: goto });
    } catch (e) {
      console.error("Failed to open file via backend", e);
    }
  }, [absolutePath, line, character]);

  if (
    relativePaths.isLoading ||
    projectRoot.isLoading ||
    relativePaths.data === undefined ||
    projectRoot.data === undefined
  ) {
    return null;
  }

  const lineChar =
    line !== undefined && character !== undefined
      ? `:${line}:${character}`
      : "";

  const exactLocation = `${friendlyPath(absolutePath, projectRoot.data, forceAbsolute ? false : relativePaths.data)}${lineChar}`;

  return (
    <Stack
      sx={{
        flexDirection: "row",
        cursor: "pointer",
        "&:hover": {
          textDecoration: "underline",
          textDecorationColor: t => t.palette.secondary.dark,
        },
        alignItems: "center",
        gap: 1,
        wordBreak: "break-all",
      }}
      key={exactLocation}
      onClick={findInPage}
    >
      {title ? <Typography sx={propertyTextStyle}>{title}</Typography> : null}
      <Typography
        variant={pathVariant}
        sx={{
          fontSize: "0.8rem",
          color: "text.secondary",
          letterSpacing: -0.25,
          ...propertyTextStyle,
        }}
      >
        {exactLocation}
      </Typography>
    </Stack>
  );
}
