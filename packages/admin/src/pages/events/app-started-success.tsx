import { Code } from "@typeslayer/common";
import type { EventAppStartedSuccess } from "@typeslayer/rust-types";
import type { D1Event } from "../../hooks";
import { EventPage } from "./event-base";

export const AppStartedSuccess = () => (
  <EventPage eventName="app_started_success">
    {event => <Page event={event} />}
  </EventPage>
);

const Page = ({ event }: { event: D1Event<EventAppStartedSuccess> }) => {
  return <Code lang="json" value={JSON.stringify(event.data, null, 2)} />;
};
