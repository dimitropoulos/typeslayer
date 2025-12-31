import type { EventTypeGraphSuccess } from "@typeslayer/rust-types";
import { Code } from "../../components/code";
import type { D1Event } from "../../hooks";
import { EventPage } from "./event-base";

export const TypeGraphSuccess = () => (
  <EventPage eventName="type_graph_success">
    {event => <Page event={event} />}
  </EventPage>
);

const Page = ({ event }: { event: D1Event<EventTypeGraphSuccess> }) => {
  return <Code lang="json" value={JSON.stringify(event.data, null, 2)} />;
};
