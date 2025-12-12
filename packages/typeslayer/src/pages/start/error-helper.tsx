import { Alert, AlertTitle, Divider, Stack, Typography } from "@mui/material";
import { Code } from "../../components/code";
import { InlineCode } from "../../components/inline-code";

const maxWidth = 700;

const CompositeProjectsError = ({
  processingErrorStdout,
}: {
  processingErrorStdout: string | null;
}) => {
  if (!processingErrorStdout) {
    return null;
  }
  if (
    !processingErrorStdout.includes(
      "Composite projects may not disable incremental compilation",
    )
  ) {
    return null;
  }

  return (
    <Alert severity="error" sx={{ maxWidth: maxWidth + 100 }}>
      <AlertTitle>There's an easy fix!</AlertTitle>

      <Stack sx={{ gap: 1 }}>
        <Typography>
          your project uses composite mode and you just got an error because of
          it. one way to address this is to customize the compiler flags to
          remove
          <InlineCode>--incremental false</InlineCode> (which is enabled in
          TypeSlayer by default).
        </Typography>
        <Typography gutterBottom>
          <em>but be warned:</em> TypeSlayer comes with the incremental mode
          turned off by default because it's intended to signal to you that in a
          composite project, when you run a trace with incremental mode on,
          TypeScript will skip projects it's already compiled in the past (and
          store that cache in <InlineCode>*.tsbuildinfo</InlineCode> files). you
          probably don't want to do that because it means you won't be seeing an
          accurate picture of the total work TypeScript has to do (cold), which
          is the whole point of this tool.
        </Typography>
        <Typography>
          so, if you <em>do</em> turn incremental mode off, make sure you clear
          all <InlineCode>*.tsbuildinfo</InlineCode> files first.
        </Typography>
        <Divider />
        <Typography variant="body2">
          note: if you wanna be part of the TypeScript Intelligentsia, add
          something like this to your shell profile
        </Typography>
        <Code
          lang="bash"
          value={`alias cleartsbuildinfo='find . -type f -name "*.tsbuildinfo" -print -delete'`}
        />
      </Stack>
    </Alert>
  );
};

const OOMError = ({
  processingErrorStderr,
}: {
  processingErrorStderr: string | null;
}) => {
  if (!processingErrorStderr) {
    return null;
  }
  if (!processingErrorStderr.includes("JavaScript heap out of memory")) {
    return null;
  }

  return (
    <Alert severity="error" sx={{ maxWidth }}>
      <AlertTitle>OOM errors happen more often than you'd think!</AlertTitle>
      <Stack sx={{ gap: 1 }}>
        <Typography>
          what happened here is <InlineCode>tsc</InlineCode> ran out of memory
          while typechecking your project.
        </Typography>
        <Typography>
          <strong>
            try again, using the <InlineCode>Customize Flags</InlineCode> button
            to increase the memory limit.
          </strong>
        </Typography>
        <Typography>
          this can actually be <em>good news</em> because it can indicate a
          genuine problem.. and you're right about to find it!
        </Typography>
        <Typography>
          orrrrrrr.. it could be <em>bad news</em> because you work in a project
          that perpetually needs more memory and despite your frequent tussles
          with management to take your internal tooling seriously.. you're left
          with the current sad state of affairs. good luck with that. it's the
          "TypeScript Professional"'s final boss.
        </Typography>
      </Stack>
    </Alert>
  );
};

export const ErrorHelper = ({
  processingError: _,
  processingErrorStderr,
  processingErrorStdout,
}: {
  processingError: string | null;
  processingErrorStderr: string | null;
  processingErrorStdout: string | null;
}) => {
  return (
    <>
      <CompositeProjectsError processingErrorStdout={processingErrorStdout} />
      <OOMError processingErrorStderr={processingErrorStderr} />
    </>
  );
};
