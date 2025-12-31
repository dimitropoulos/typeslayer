import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

const API_ORIGIN =
  import.meta.env.VITE_ADMIN_API_ORIGIN ?? "http://127.0.0.1:8787";

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

type EventResponse = z.infer<typeof EventSchema>;

const fetchEvents = async (): Promise<EventResponse[]> => {
  const res = await fetch(`${API_ORIGIN}/events?limit=200`);
  if (!res.ok) {
    throw new Error(`Failed to load events: ${res.status}`);
  }

  const json = await res.json();
  const parsed = EventsResponseSchema.parse(json);
  return parsed.events;
};

export const Events = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return <div>Loading events...</div>;
  }

  if (error) {
    return <div>Error loading events: {String(error)}</div>;
  }

  if (!data || data.length === 0) {
    return <div>No events found.</div>;
  }

  return (
    <div
      style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}
    >
      {data.map(evt => (
        <div
          key={evt.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 12,
            background: "#fafafa",
          }}
        >
          <div style={{ fontWeight: 600 }}>{evt.name}</div>
          <div style={{ fontSize: 12, color: "#666" }}>
            session: {evt.sessionId} • ts:{" "}
            {new Date(evt.timestamp).toLocaleString()}
          </div>
          <pre
            style={{
              marginTop: 8,
              background: "#fff",
              padding: 8,
              borderRadius: 6,
              overflow: "auto",
              maxHeight: 320,
            }}
          >
            {JSON.stringify(evt.data, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
};
