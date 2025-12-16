import { Box, Stack, Tab, type TabProps, Typography } from "@mui/material";

export const TabLabel = ({
  label,
  count,
}: {
  label: string;
  count: number | null;
}) => (
  <Stack
    sx={{
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    }}
  >
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
        {count.toLocaleString()}
      </Box>
    )}
  </Stack>
);

export function VerticalTab({
  label,
  count,
  value,
  ...props
}: {
  label: string;
  count: number | null;
  value: string;
} & TabProps) {
  return (
    <Tab
      {...props}
      sx={{
        flexShrink: 0,
        display: "flex",
        border: 1,
        borderColor: "transparent",
        fontWeight: "normal",
        "&.Mui-selected": {
          fontWeight: "bold",
          fontSize: "1rem",
          backgroundColor: "#ffffff05",
          borderColor: "#ffffff10",
          letterSpacing: "-0.0155em",
        },
      }}
      label={
        <Stack
          sx={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            width: "100%",
            flexShrink: 0,
          }}
        >
          <Typography
            className="vertical-tab-label"
            sx={{
              fontWeight: "inherit",
              flexShrink: 0,
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
                pl: 3,
                letterSpacing: "normal",
                flexShrink: 0,
              }}
            >
              {count.toLocaleString()}
            </Box>
          )}
        </Stack>
      }
      key={value}
      value={value}
    />
  );
}
