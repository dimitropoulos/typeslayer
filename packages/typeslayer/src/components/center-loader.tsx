import { Box, CircularProgress } from "@mui/material";

export const CenterLoader = () => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      p: 3,
      alignItems: "center",
      height: "100%",
    }}
  >
    <CircularProgress size={40} />
  </Box>
);
