import { Stack } from "@mui/material";
import type { EventTypeGraphFail } from "@typeslayer/rust-types";
import { Code } from "../../components/code";
import { type D1Event, EventPage } from "./event-base";
import { Metadata } from "./metadata";

export const TypeGraphFail = () => (
  <EventPage eventName="type_graph_fail" title="Type Graph Fail">
    {event => <Page event={event} />}
  </EventPage>
);

const Page = ({ event }: { event: D1Event<EventTypeGraphFail> }) => {
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
