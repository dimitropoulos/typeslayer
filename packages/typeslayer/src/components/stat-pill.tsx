import { Box, type SxProps, Typography } from "@mui/material";

export const StatPill = ({
  label,
  value,
  sx = {},
}: {
  label: string;
  value: number;
  sx?: SxProps | undefined;
}) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 1,
      px: 1.25,
      py: 0.25,
      border: t => `1px solid ${t.palette.primary.main}80`,
      ...sx,
    }}
  >
    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
      {value.toLocaleString()}
    </Typography>
    <Typography
      variant="caption"
      sx={{ textTransform: "uppercase", letterSpacing: 1 }}
    >
      {label}
    </Typography>
  </Box>
);
