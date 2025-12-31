import { Stack } from "@mui/material";
import { StatChip, type StatChipProps } from "./stat-chip";

export const ChipsList = ({ chips }: { chips: StatChipProps[] }) => {
  return (
    <Stack sx={{ flexDirection: "row", gap: 2, flexWrap: "wrap" }}>
      {...chips.map(({ label, value, icon }) => (
        <StatChip key={label} label={label} value={value} icon={icon} />
      ))}
    </Stack>
  );
};
