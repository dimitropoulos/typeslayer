import { Stack } from "@mui/material";
import type { EventAnalyzeTraceSuccess } from "@typeslayer/rust-types";
import { Code } from "../../components/code";
import { type D1Event, EventPage } from "./event-base";
import { Metadata } from "./metadata";

export const AnalyzeTraceSuccess = () => (
  <EventPage eventName="analyze_trace_success" title="Analyze Trace Success">
    {event => <Page event={event} />}
  </EventPage>
);

const Page = ({ event }: { event: D1Event<EventAnalyzeTraceSuccess> }) => {
  return (
    <Stack
      sx={{
        padding: 1,
        gap: 3,
        overflowY: "auto",
      }}
    >
      <Metadata event={event} extraRows={[]} extraChips={[]} />
      <Code lang="json" value={JSON.stringify(event.data, null, 2)} />
    </Stack>
  );
};
