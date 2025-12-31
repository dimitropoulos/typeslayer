import Info from "@mui/icons-material/Info";
import { Stack, type SxProps, Typography } from "@mui/material";

export function Callout({
  children,
  title,
  sx = {},
}: {
  title: string;
  children: React.ReactNode;
  sx?: SxProps;
}) {
  return (
    <Stack
      gap={2}
      direction="row"
      sx={{
        background: t => t.palette.background.paper,
        padding: 2,
        color: t => t.palette.text.secondary,
        ...sx,
      }}
    >
      <Info sx={{ fontSize: "1.5em", mt: 0.5 }} />
      <Stack gap={2} sx={{ opacity: 0.9, alignItems: "flex-start" }}>
        <Typography variant="h6">{title}</Typography>
        {children}
      </Stack>
    </Stack>
  );
}
