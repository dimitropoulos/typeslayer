import { Summarize } from "@mui/icons-material";
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "@tanstack/react-router";
import { InlineCode } from "@typeslayer/common";
import { PackageManagerIcon } from "../../components/package-manager-icon";
import { PlatformIcon } from "../../components/platform-detection";
import {
  type D1Event,
  type Event,
  type EventByName,
  useEvents,
} from "../../hooks";
import { formatEpoch, middleDot } from "../../utils";
import { PlatformPercentages } from "../explore/app-started/platform-percentages";
import { Metadata } from "./metadata";

export const EventPage = <E extends Event["name"]>({
  eventName,
  children,
}: {
  eventName: E;
  children: (event: D1Event<EventByName[E]>) => React.ReactNode;
}) => {
  const { data: events, isLoading, error } = useEvents(eventName);
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();

  const isMetadataView = id === "metadata";
  const selectedEventId = isMetadataView
    ? undefined
    : id
      ? Number(id)
      : undefined;
  const selectedIndex = selectedEventId
    ? (events?.findIndex(e => e.id === selectedEventId) ?? -1)
    : -1;

  if (isLoading) {
    return <div>Loading…</div>;
  }

  if (error) {
    return <div>Error loading events: {String(error)}</div>;
  }

  if (!events || events.length === 0) {
    return <div>No events found.</div>;
  }

  const selected: (typeof events)[number] | undefined = events[selectedIndex];

  return (
    <Stack sx={{ flexDirection: "row" }}>
      <Stack
        sx={{
          width: 300,
          flexShrink: 0,
          gap: 2,
          overflowY: "auto",
          minHeight: 0,
          height: "100vh",
          borderRight: 1,
          borderColor: "divider",
          background: "black",
        }}
      >
        <List>
          <ListSubheader>Aggregated</ListSubheader>
          <ListItemButton
            selected={isMetadataView}
            onClick={() => navigate({ to: `/events/${eventName}/metadata` })}
          >
            <ListItemIcon>
              <Summarize color="disabled" />
            </ListItemIcon>
            <ListItemText primary="Metadata" />
          </ListItemButton>

          <ListSubheader>Raw Events</ListSubheader>
          {events.map((event, index) => (
            <ListItemButton
              key={event.id}
              selected={selectedIndex === index}
              onClick={() =>
                navigate({ to: `/events/${eventName}/${event.id}` })
              }
              sx={{ cursor: "pointer" }}
            >
              <ListItemText
                primary={
                  <Stack direction="row" alignItems="center" gap={1}>
                    <InlineCode>{event.id}</InlineCode>
                    {middleDot}
                    <Typography sx={{ fontFamily: "monospace" }}>
                      {formatEpoch(event.timestamp)}
                    </Typography>
                  </Stack>
                }
                secondary={
                  <Stack direction="row" gap={1} alignItems="center">
                    <PlatformIcon platform={event.platform} />
                    {"packageManager" in event.data ? (
                      <>
                        <PackageManagerIcon
                          packageManager={event.data.packageManager}
                        />
                        {middleDot}
                      </>
                    ) : null}
                    <Typography sx={{ fontFamily: "monospace" }}>
                      {event.sessionId}
                    </Typography>
                    {middleDot}
                    <Typography variant="body2">v{event.version}</Typography>
                  </Stack>
                }
                slotProps={{
                  primary: {
                    sx: {
                      fontFamily: "monospace",
                    },
                  },
                }}
              />
            </ListItemButton>
          ))}
        </List>
      </Stack>

      <Stack
        sx={{
          gap: 2,
          flexGrow: 1,
          maxHeight: "100vh",
          overflowY: "auto",
        }}
      >
        {isMetadataView ? (
          <Box sx={{ p: 2 }}>
            <PlatformPercentages eventName={eventName} />
          </Box>
        ) : (
          <>
            <Metadata event={selected} />
            <Box sx={{ px: 2 }}>
              {selected ? children(selected as D1Event<EventByName[E]>) : null}
            </Box>
          </>
        )}
      </Stack>
    </Stack>
  );
};
