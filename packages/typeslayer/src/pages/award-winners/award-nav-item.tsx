import { Box, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { type AwardId, awards } from "./awards";
import { useAwardId } from "./use-award-id";

/** format a number to be no more than 4 chars, using K for thousands and M for millions */
const formatNumber = (num: number): string => {
  if (num === 0) {
    return "    ";
  }
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

export const AwardNavItem = ({
  awardId,
  value,
}: {
  awardId: AwardId;
  value: number;
}) => {
  const { activeAward, setActiveAward } = useAwardId();

  const { title, icon: Icon } = awards[awardId];
  const selected = activeAward === awardId;
  const displayValue = formatNumber(value);
  return (
    <ListItemButton
      key={awardId}
      selected={selected}
      onClick={() => {
        setActiveAward(awardId);
      }}
      dense
    >
      <ListItemIcon sx={{ minWidth: 38 }}>
        <Icon />
      </ListItemIcon>
      <ListItemText primary={title} />

      <Box
        sx={{
          marginLeft: 4,
          fontSize: 13,
          color: t => t.palette.secondary.main,
          fontWeight: "bold",
          fontFamily: "monospace",
        }}
      >
        {displayValue}
      </Box>
    </ListItemButton>
  );
};
