import { Link, Stack, Typography } from "@mui/material";

export const CiCdIntegration = () => {
  return (
    <Stack sx={{ p: 4, gap: 3 }}>
      <Typography variant="h2">CI/CD Integration </Typography>
      <Typography>
        Planned, but not implemented until I get more use-cases on what people
        would want this for.
      </Typography>
      <Typography>
        That said, the fact that you clicked here means you're of of those
        people. <Link href="/about">lemme know..</Link>
      </Typography>
    </Stack>
  );
};
