import { Button, Stack, Typography } from "@mui/material";
import type { Dispatch, SetStateAction } from "react";

export const ShowMore = ({
  incrementsOf = 100,
  totalItems,
  displayLimit,
  setDisplayLimit,
}: {
  incrementsOf: number;
  displayLimit: number;
  totalItems: number;
  setDisplayLimit: Dispatch<SetStateAction<number>>;
}) => {
  /** the point at which it will start showing this at all, and the number of which you can advance by */
  const remaining = totalItems - displayLimit;
  const hasMore = totalItems > displayLimit;

  if (!hasMore) {
    return null;
  }

  return (
    <Stack
      direction="row"
      gap={1}
      alignItems="center"
      sx={{ px: 2, pl: 0, mb: 2, mt: 0.5 }}
    >
      <Button
        variant="outlined"
        size="small"
        onClick={() => setDisplayLimit(prev => prev + incrementsOf)}
      >
        Show {Math.min(incrementsOf, remaining).toLocaleString()} more
      </Button>
      <Typography variant="body2" color="text.secondary">
        showing {displayLimit.toLocaleString()} out of{" "}
        {totalItems.toLocaleString()}
      </Typography>
    </Stack>
  );
};
