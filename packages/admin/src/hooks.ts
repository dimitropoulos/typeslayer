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
import { z } from "zod";

export type Event =
  | EventAppStartedFail
  | EventAppStartedSuccess
  | EventGenerateTraceFail
  | EventGenerateTraceSuccess
  | EventAnalyzeTraceFail
  | EventAnalyzeTraceSuccess
  | EventTypeGraphFail
  | EventTypeGraphSuccess;

export type EventByName = {
  [E in Event as E["name"]]: E;
};

const API_ORIGIN =
  import.meta.env.VITE_ADMIN_API_ORIGIN ?? "http://127.0.0.1:8787";

interface ExtraD1Columns {
  id: number;
}

const EventSchema = z.object({
  id: z.number(),
  name: z.string(),
  sessionId: z.string(),
  timestamp: z.number(),
  version: z.string().nullable(),
  platform: z.string().nullable(),
  mode: z.string().nullable(),
  data: z.json(),
});

const EventsResponseSchema = z.object({
  events: z.array(EventSchema),
});

export type D1Event<E extends Event> = ExtraD1Columns & E;

const fetchEvents = async <E extends Event["name"]>(
  eventName: E,
): Promise<D1Event<EventByName[E]>[]> => {
  const res = await fetch(
    `${API_ORIGIN}/events/${encodeURIComponent(eventName)}?limit=200`,
  );
  if (!res.ok) {
    throw new Error(`Failed to load events: ${res.status}`);
  }

  const json = await res.json();
  const parsed = EventsResponseSchema.parse(json) as unknown as {
    events: D1Event<EventByName[E]>[];
  };
  return parsed.events;
};

export const useEvents = <E extends Event["name"]>(eventName: E) =>
  useQuery({
    queryKey: ["events", eventName],
    queryFn: () => fetchEvents(eventName),
    refetchInterval: 15000,
  });

export const useEventCounts = () =>
  useQuery({
    queryKey: ["eventCounts"],
    queryFn: async () => {
      const res = await fetch(`${API_ORIGIN}/events/counts`);
      if (!res.ok) {
        throw new Error(`Failed to load event counts: ${res.status}`);
      }
      const json = (await res.json()) as Record<Event["name"], number>;
      return json as Record<string, number>;
    },
  });
