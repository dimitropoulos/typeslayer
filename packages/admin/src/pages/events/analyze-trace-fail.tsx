import { Code } from "@typeslayer/common";
import type { EventAnalyzeTraceFail } from "@typeslayer/rust-types";
import type { D1Event } from "../../hooks";
import { EventPage } from "./event-base";

export const AnalyzeTraceFail = () => (
  <EventPage eventName="analyze_trace_fail">
    {event => <Page event={event} />}
  </EventPage>
);

const Page = ({ event }: { event: D1Event<EventAnalyzeTraceFail> }) => {
  return <Code lang="json" value={JSON.stringify(event.data, null, 2)} />;
};
