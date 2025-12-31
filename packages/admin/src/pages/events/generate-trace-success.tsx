import { Stack } from "@mui/material";
import type { EventGenerateTraceSuccess } from "@typeslayer/rust-types";
import { ChipsList } from "../../components/chips-list";
import { Code } from "../../components/code";
import { PackageManagerIcon } from "../../components/package-manager-icon";
import { StatTable } from "../../components/stat-table";
import type { D1Event } from "../../hooks";
import { EventPage } from "./event-base";

export const GenerateTraceSuccess = () => (
  <EventPage eventName="generate_trace_success">
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
    <Stack sx={{ gap: 2 }}>
      <ChipsList
        chips={[
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
            icon: <PackageManagerIcon packageManager={packageManager} />,
          },
          {
            label: "project flag",
            value: `${applyTscProjectFlag}`,
          },
          {
            label: "duration",
            value: `${duration.toLocaleString()} ms`,
          },
        ]}
      />

      <StatTable
        items={[
          {
            label: "tscExtraFlags",
            data: tscExtraFlags,
          },
        ]}
      />

      <Stack sx={{ gap: 1 }}>
        <Code lang="bash" value={stdout || "\n"} title="stdout" />
        <Code lang="bash" value={stderr || "\n"} title="stderr" />
      </Stack>
    </Stack>
  );
};
