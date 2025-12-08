import { Alert, Link } from "@mui/material";

export const NoData = () => {
  return (
    <Alert severity="error" sx={{ ml: 2 }}>
      it looks like you haven't run diagnostics yet. go to{" "}
      <Link href="/start">Start</Link>.
    </Alert>
  );
};
