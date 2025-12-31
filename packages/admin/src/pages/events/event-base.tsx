import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import type {
  EventAnalyzeTraceFail,
  EventAnalyzeTraceSuccess,
  EventAppStartedFail,
  EventAppStartedSuccess,
  EventGenerateTraceFail,
  EventGenerateTraceSuccess,
  EventTypeGraphFail,
  EventTypeGraphSuccess,
} from "@typeslayer/rust-types";
import { useState } from "react";
import { z } from "zod";
import { PlatformIcon } from "../../components/platform-icon";
import { formatEpoch, middleDot } from "../../utils";

const API_ORIGIN =
  import.meta.env.VITE_ADMIN_API_ORIGIN ?? "http://127.0.0.1:8787";

interface ExtraD1Columns {
  id: number;
  receivedAt: number;
}

const EventSchema = z.object({
  id: z.number(),
  name: z.string(),
  sessionId: z.string(),
  timestamp: z.number(),
  version: z.string().nullable(),
  platform: z.string().nullable(),
  mode: z.string().nullable(),
  receivedAt: z.number(),
  data: z.json(),
});

const EventsResponseSchema = z.object({
  events: z.array(EventSchema),
});

export type D1Event<E extends Event> = ExtraD1Columns & E;

const fetchEvents = async <E extends Event>(
  eventName: E["name"],
): Promise<D1Event<E>[]> => {
  const res = await fetch(
    `${API_ORIGIN}/events/${encodeURIComponent(eventName)}?limit=200`,
  );
  if (!res.ok) {
    throw new Error(`Failed to load events: ${res.status}`);
  }

  const json = await res.json();
  const parsed = EventsResponseSchema.parse(json) as unknown as {
    events: D1Event<E>[];
  };
  return parsed.events;
};

export type Event =
  | EventAppStartedFail
  | EventAppStartedSuccess
  | EventGenerateTraceFail
  | EventGenerateTraceSuccess
  | EventAnalyzeTraceFail
  | EventAnalyzeTraceSuccess
  | EventTypeGraphFail
  | EventTypeGraphSuccess;

type EventByName = {
  [E in Event as E["name"]]: E;
};

export const EventPage = <E extends Event["name"]>({
  eventName,
  title,
  children,
}: {
  eventName: E;
  title: string;
  children: (event: D1Event<EventByName[E]>) => React.ReactNode;
}) => {
  const {
    data: events,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["events", eventName],
    queryFn: () => fetchEvents(eventName),
    refetchInterval: 15000,
  });
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

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
        <Typography variant="h5" sx={{ pt: 2, px: 2 }}>
          {title}
        </Typography>
        <List>
          {events.map((event, index) => (
            <ListItemButton
              key={event.id}
              selected={selectedIndex === index}
              onClick={() => setSelectedIndex(index)}
              sx={{ cursor: "pointer" }}
            >
              <ListItemText
                primary={
                  /// epoch timestamp formatted as `Dec 30 · 19:30:33`
                  <Typography sx={{ fontFamily: "monospace" }}>
                    {formatEpoch(event.timestamp)}
                  </Typography>
                }
                secondary={
                  <Stack direction="row" gap={1} alignItems="center">
                    <PlatformIcon platform={event.platform} />
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

      <Box sx={{ flexGrow: 1, p: 2, maxHeight: "100vh", overflowY: "auto" }}>
        {selected ? children(selected as D1Event<EventByName[E]>) : null}
      </Box>
    </Stack>
  );
};
