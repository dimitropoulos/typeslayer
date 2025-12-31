import type { EventAnalyzeTraceSuccess } from "@typeslayer/rust-types";
import { Code } from "../../components/code";
import type { D1Event } from "../../hooks";
import { EventPage } from "./event-base";

export const AnalyzeTraceSuccess = () => (
  <EventPage eventName="analyze_trace_success">
    {event => <Page event={event} />}
  </EventPage>
);

const Page = ({ event }: { event: D1Event<EventAnalyzeTraceSuccess> }) => {
  return <Code lang="json" value={JSON.stringify(event.data, null, 2)} />;
};
