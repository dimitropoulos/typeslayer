import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";
import { PlatformIcon } from "../../components/platform-icon";
import { StatChip, type StatChipProps } from "../../components/stat-chip";
import { formatEpoch } from "../../utils";
import type { D1Event, Event } from "./event-base";

export const Metadata = <E extends D1Event<Event>>({
  event,
  extraRows = [],
  extraChips = [],
}: {
  event: E;
  extraRows?: { label: string; data: ReactNode }[];
  extraChips?: StatChipProps[];
}) => {
  const { id, sessionId, timestamp, version, platform, mode } = event;

  const items = [...extraRows];

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
      <Stack sx={{ flexDirection: "row", gap: 4, alignItems: "flex-end" }}>
        <Typography variant="h4" title="epoch timestamp">
          {friendlyTimestamp}
        </Typography>
        <Typography variant="h6" title="human friendly timestamp">
          {timestamp}
        </Typography>
      </Stack>
      <Stack sx={{ flexDirection: "row", gap: 2, flexWrap: "wrap" }}>
        <StatChip
          label="platform"
          value={platform}
          icon={<PlatformIcon platform={platform} />}
        />
        <StatChip label="session id" value={sessionId} />
        <StatChip label="version" value={version} />
      </Stack>
      <Stack sx={{ flexDirection: "row", gap: 2, flexWrap: "wrap" }}>
        {...chips.map(({ label, value, icon }) => (
          <StatChip key={label} label={label} value={value} icon={icon} />
        ))}
      </Stack>
      <Stack sx={{ flexDirection: "row", gap: 2, flexWrap: "wrap" }}>
        {...extraChips.map(({ label, value, icon }) => (
          <StatChip key={label} label={label} value={value} icon={icon} />
        ))}
      </Stack>
      {items.length > 0 ? (
        <Stack sx={{ gap: 1 }}>
          <Typography variant="h6">Metadata</Typography>
          <Table size="small">
            <TableBody>
              {items.map(({ label, data }) => (
                <TableRow key={label}>
                  <TableCell>{label}</TableCell>
                  <TableCell>
                    {typeof data === "string" || typeof data === "number"
                      ? data
                      : JSON.stringify(data, null, 2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      ) : null}
    </Stack>
  );
};
