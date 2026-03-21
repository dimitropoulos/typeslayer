import { Box, Stack, Typography } from "@mui/material";

const toOrdinal = (n: number) => {
  const _n = n % 100;
  const suffix = _n > 3 && _n < 21 ? 'th' : ['th', 'st', 'nd', 'rd'][_n % 10] || 'th';
  return `${n}${suffix}`;
}

export const InlineBarGraph = ({
  width,
  label,
  rank,
}: {
  width: string;
  label: string;
  rank?: number;
}) => {
  return (
    <Stack>
      <Box
        sx={{
          width,
          height: "4px",
          backgroundColor: theme => theme.palette.primary.main,
          borderRadius: "2px",
          marginTop: "2px",
        }}
      />

      <Typography
        sx={{
          color: theme => theme.palette.text.secondary,
          fontSize: "0.8rem",
        }}
      >
        {label}{rank ? `\u00A0\u00A0·\u00A0\u00A0${toOrdinal(rank)}` : ''}
      </Typography>
    </Stack>
  );
};
