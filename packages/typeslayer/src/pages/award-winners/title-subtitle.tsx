import { Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

export function TitleSubtitle({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: ReactNode | string;
  icon: ReactNode;
}) {
  return (
    <Stack sx={{ gap: 2, py: 1, pb: 2, px: 2 }}>
      <Stack direction="row" gap={2} alignItems="center">
        {icon}
        <Typography variant="h4">{title}</Typography>
      </Stack>
      <Typography>{subtitle}</Typography>
    </Stack>
  );
}
