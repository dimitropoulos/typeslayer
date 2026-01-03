import { Code } from "@typeslayer/common";
import type { EventAppStartedFail } from "@typeslayer/rust-types";
import type { D1Event } from "../../hooks";
import { EventPage } from "./event-base";

export const AppStartedFail = () => (
  <EventPage eventName="app_started_fail">
    {event => <Page event={event} />}
  </EventPage>
);

const Page = ({ event }: { event: D1Event<EventAppStartedFail> }) => {
  return <Code lang="json" value={JSON.stringify(event.data, null, 2)} />;
};
