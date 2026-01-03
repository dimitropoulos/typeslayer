import { Stack } from "@mui/material";
import { LinkKindTable } from "@typeslayer/common";
import type { EventTypeGraphSuccess } from "@typeslayer/rust-types";
import { StatChip } from "../../components/stat-chip";
import type { D1Event } from "../../hooks";
import { EventPage } from "./event-base";

export const TypeGraphSuccess = () => (
  <EventPage eventName="type_graph_success">
    {event => <Page event={event} />}
  </EventPage>
);

const Page = ({ event }: { event: D1Event<EventTypeGraphSuccess> }) => {
  return (
    <>
      <Stack sx={{ flexDirection: "row", gap: 2, mb: 2 }}>
        <StatChip label="nodes" value={event.data.nodeCount.toLocaleString()} />
        <StatChip label="links" value={event.data.linkCount.toLocaleString()} />
        <StatChip
          label="duration"
          value={`${event.data.duration.toLocaleString()} ms`}
        />
      </Stack>

      <LinkKindTable linkKindDataByKind={event.data.linkKindDataByKind} />
    </>
  );
};
