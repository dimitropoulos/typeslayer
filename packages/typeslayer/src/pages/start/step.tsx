import { Box, Typography, useTheme } from "@mui/material";
import type { PropsWithChildren } from "react";

export const Step = ({
  step,
  children,
}: PropsWithChildren<{ step: number }>) => {
  const theme = useTheme();
  return (
    <Box sx={{ gap: 2, display: "flex" }}>
      <Typography
        variant="h6"
        component="div"
        sx={{
          borderRight: `2px solid ${theme.palette.divider}`,
          pr: 1,
          color: "text.secondary",
        }}
      >
        {step}
      </Typography>
      {children}
    </Box>
  );
};
