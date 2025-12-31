import { Stack, Typography } from "@mui/material";
import { InlineCode } from "@typeslayer/common";
import { PlatformIcon } from "../../components/platform-detection";
import { StatChip, type StatChipProps } from "../../components/stat-chip";
import type { D1Event, Event } from "../../hooks";
import { formatEpoch } from "../../utils";

export const Metadata = <E extends D1Event<Event>>({ event }: { event: E }) => {
  const { id, sessionId, timestamp, version, platform, mode } = event;

  const friendlyTimestamp = formatEpoch(timestamp);

  const chips: StatChipProps[] = [
    {
      label: "event id",
      value: `${id}`,
    },
    { label: "mode", value: mode },
  ];

  return (
    <Stack sx={{ gap: 2 }}>
      <Stack
        sx={{
          flexDirection: "row",
          gap: 2,
          alignItems: "flex-end",
          backgroundColor: "black",
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="h4" title="epoch timestamp" color="secondary">
          Event <InlineCode>{id}</InlineCode>
        </Typography>
        <Typography variant="h4" title="epoch timestamp">
          {friendlyTimestamp}{" "}
          <Typography
            title="human friendly timestamp"
            sx={{
              display: "inline",
              ml: 0.25,
              fontFamily: "monospace",
            }}
          >
            (timestamp: {timestamp})
          </Typography>
        </Typography>
      </Stack>

      <Stack sx={{ flexDirection: "row", gap: 2, flexWrap: "wrap", px: 2 }}>
        <StatChip
          label="platform"
          value={platform}
          icon={<PlatformIcon platform={platform} />}
        />
        <StatChip label="session id" value={sessionId} />
        <StatChip label="version" value={version} />
      </Stack>

      <Stack sx={{ flexDirection: "row", gap: 2, flexWrap: "wrap", px: 2 }}>
        {...chips.map(({ label, value, icon }) => (
          <StatChip key={label} label={label} value={value} icon={icon} />
        ))}
      </Stack>
    </Stack>
  );
};
