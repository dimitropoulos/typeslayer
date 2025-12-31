import { Stack } from "@mui/material";
import type { EventGenerateTraceFail } from "@typeslayer/rust-types";
import { Code } from "../../components/code";
import { type D1Event, EventPage } from "./event-base";
import { Metadata } from "./metadata";

export const GenerateTraceFail = () => (
  <EventPage eventName="generate_trace_fail" title="Generate Trace Fail">
    {event => <Page event={event} />}
  </EventPage>
);

const Page = ({ event }: { event: D1Event<EventGenerateTraceFail> }) => {
  const {
    duration,
    applyTscProjectFlag,
    maxOldSpaceSize,
    maxStackSize,
    packageManager,
    stderr,
    stdout,
    tscExtraFlags,
    typescriptCompilerVariant,
  } = event.data;

  return (
    <Stack
      sx={{
        padding: 1,
        gap: 3,
        overflowY: "auto",
      }}
    >
      <Metadata
        event={event}
        extraRows={[
          {
            label: "duration",
            data: duration,
          },
          {
            label: "tscExtraFlags",
            data: tscExtraFlags,
          },
        ]}
        extraChips={[
          {
            label: "compiler",
            value: typescriptCompilerVariant,
          },

          {
            label: "RAM",
            value: `${maxOldSpaceSize}`,
          },
          {
            label: "stack",
            value: `${maxStackSize}`,
          },
          {
            label: "package manager",
            value: packageManager,
          },
          {
            label: "project flag",
            value: `${applyTscProjectFlag}`,
          },
        ]}
      />

      {stdout ? (
        <Code lang="bash" value={stdout} title="stdout" />
      ) : (
        <span>no stdout output</span>
      )}

      {stderr ? (
        <Code lang="bash" value={stderr} title="stderr" />
      ) : (
        <span>no stderr output</span>
      )}
    </Stack>
  );
};
