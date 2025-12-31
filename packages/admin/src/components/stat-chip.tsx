import { Divider, Stack, Typography } from "@mui/material";
import type { JSX } from "react";

export interface StatChipProps {
  label: string;
  value: string;
  icon?: JSX.Element;
  column?: boolean | undefined;
}

export const StatChip = ({
  label,
  value,
  icon,
  column = false,
}: StatChipProps) => {
  return (
    <Stack
      sx={{
        flexDirection: column ? "column" : "row",
        border: 1,
        alignItems: "center",
        borderColor: t => t.palette.primary.dark,
      }}
    >
      <Stack
        sx={{
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "stretch",
          justifyContent: "center",
          wordBreak: "keep-all",
          whiteSpace: "nowrap",
          gap: 0.5,
          py: 0.5,
          px: 1,
          backgroundColor: t => t.palette.action.hover,
        }}
      >
        {icon ?? null}
        <Typography>{label}</Typography>
      </Stack>

      <Divider orientation={column ? "horizontal" : "vertical"} />

      <Typography
        sx={{
          py: 0.5,
          px: 1,

          wordBreak: "keep-all",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
};
