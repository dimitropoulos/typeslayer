import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { Code, InlineCode } from "@typeslayer/common";
import { useCallback, useState } from "react";
import { PlatformIcon } from "../../components/platform-detection";
import { StatChip } from "../../components/stat-chip";
import type { D1Event, Event } from "../../hooks";
import { formatEpoch } from "../../utils";

export const Metadata = <E extends D1Event<Event>>({ event }: { event: E }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toggleModal = useCallback(() => {
    setIsModalOpen(open => !open);
  }, []);

  const { id, sessionId, timestamp, version, platform, mode } = event;

  const friendlyTimestamp = formatEpoch(timestamp);

  return (
    <Stack sx={{ gap: 2 }}>
      <Stack
        sx={{
          flexDirection: "row",
          backgroundColor: "black",
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack sx={{ flexDirection: "row", gap: 2, alignItems: "flex-end" }}>
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
        <Button size="small" variant="outlined" onClick={toggleModal}>
          View Raw JSON
        </Button>
      </Stack>

      <Stack sx={{ flexDirection: "row", gap: 2, flexWrap: "wrap", px: 2 }}>
        <StatChip
          label="platform"
          value={platform}
          icon={<PlatformIcon platform={platform} />}
        />
        <StatChip label="session id" value={sessionId} />
        <StatChip label="version" value={version} />
        <StatChip label="mode" value={mode} />
      </Stack>

      {isModalOpen ? (
        <Dialog open={isModalOpen} onClose={toggleModal} fullWidth>
          <DialogTitle>Event Metadata JSON</DialogTitle>
          <DialogContent>
            <Code lang="json" value={JSON.stringify(event, null, 2)} />
          </DialogContent>
          <DialogActions>
            <Button onClick={toggleModal}>Close</Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </Stack>
  );
};
