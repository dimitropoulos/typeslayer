import { Stack, Typography } from "@mui/material";
import type { EventGenerateTraceSuccess } from "@typeslayer/rust-types";
import { Code } from "../../components/code";
import { type D1Event, EventPage } from "./event-base";
import { Metadata } from "./metadata";

export const GenerateTraceSuccess = () => (
  <EventPage eventName="generate_trace_success" title="Generate Trace Success">
    {event => <Page event={event} />}
  </EventPage>
);

const Page = ({ event }: { event: D1Event<EventGenerateTraceSuccess> }) => {
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

      <Stack sx={{ gap: 1 }}>
        <Typography variant="h6">Stdout</Typography>
        {stdout ? (
          <Code lang="bash" value={stdout} />
        ) : (
          <span>No stdout output</span>
        )}
      </Stack>

      <Stack sx={{ gap: 1 }}>
        <Typography variant="h6">Stderr</Typography>
        {stderr ? (
          <Code lang="bash" value={stderr} />
        ) : (
          <span>No stderr output</span>
        )}
      </Stack>
    </Stack>
  );
};
