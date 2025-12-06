import { Box, Typography } from "@mui/material";

export const StatPill = ({
  label,
  value,
}: {
  label: string;
  value: number;
}) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "baseline",
      gap: 1,
      px: 1.25,
      py: 0.5,
      border: t => `1px solid ${t.palette.primary.main}80`,
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
