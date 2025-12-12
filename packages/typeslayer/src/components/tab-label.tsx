import { Box, Stack, Typography } from "@mui/material";

export const TabLabel = ({
  label,
  count,
}: {
  label: string;
  count: number | null;
}) => (
  <Stack sx={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
    <Typography
      sx={{
        fontWeight: "inherit",
      }}
    >
      {label}
    </Typography>
    {count !== null && (
      <Box
        sx={{
          color: "secondary.main",
          fontSize: "1rem",
          fontWeight: "bold",
        }}
      >
        {count}
      </Box>
    )}
  </Stack>
);
