import type { EventTypeGraphFail } from "@typeslayer/rust-types";
import { Code } from "../../components/code";
import type { D1Event } from "../../hooks";
import { EventPage } from "./event-base";

export const TypeGraphFail = () => (
  <EventPage eventName="type_graph_fail">
    {event => <Page event={event} />}
  </EventPage>
);

const Page = ({ event }: { event: D1Event<EventTypeGraphFail> }) => {
  return <Code lang="json" value={JSON.stringify(event.data, null, 2)} />;
};
