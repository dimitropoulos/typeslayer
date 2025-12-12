import { Button, Stack, Typography } from "@mui/material";
import { type ReactNode, useState } from "react";

export const ShowMoreChildren = ({
  incrementsOf = 100,
  children,
}: {
  incrementsOf: number;
  children: ReactNode[];
}) => {
  const [currentlyShowing, setCurrentlyShowing] = useState(incrementsOf);
  const totalItems = children.length;
  const remaining = totalItems - currentlyShowing;
  const hasMore = totalItems > currentlyShowing;
  return (
    <>
      {children.slice(0, currentlyShowing)}
      {hasMore ? (
        <Stack
          direction="row"
          gap={1}
          alignItems="center"
          sx={{ px: 2, pl: 0, mb: 2, mt: 0.5 }}
        >
          <Button
            variant="outlined"
            size="small"
            onClick={() => setCurrentlyShowing(prev => prev + incrementsOf)}
          >
            Show {Math.min(incrementsOf, remaining).toLocaleString()} more
          </Button>
          <Typography variant="body2" color="text.secondary">
            showing {currentlyShowing.toLocaleString()} out of{" "}
            {totalItems.toLocaleString()}
          </Typography>
        </Stack>
      ) : null}
    </>
  );
};
