import { Link, Stack, Typography } from "@mui/material";

export const CiCdIntegration = () => {
  return (
    <Stack sx={{ p: 4, gap: 3 }}>
      <Typography variant="h2">CI/CD Integration </Typography>
      <Typography>
        this is something that's planned, but I don't want to implement it until
        I get specific use-cases on what exactly people would want this for.
      </Typography>
      <Typography>
        that said, the fact that you clicked here means you're one of those
        people. <Link href="/about">lemme know..</Link>
      </Typography>
    </Stack>
  );
};
