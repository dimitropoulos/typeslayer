import Flag from "@mui/icons-material/Flag";
import InfoOutline from "@mui/icons-material/InfoOutline";
import { Alert, Button, Stack, Typography } from "@mui/material";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { InlineCode } from "@typeslayer/common";
import { useCallback, useState } from "react";
import { Step } from "./step";

export const step4 = (
  <Step step={4}>
    <Stack gap={0.5}>
      <Typography variant="h5">
        mindset: after a build, all code is "your code"
      </Typography>
      <Typography>
        the point of a tool like this is to diagnose performance problems...{" "}
        <em>and it's perfectly possible your project doesn't have any!</em> but
        if there <em>are</em> problems, those problems can come from anywhere in
        your total build.{" "}
      </Typography>
      <Typography>
        so, if you find yourself thinking "but I just want to look at{" "}
        <em>my types</em> not all any of the 3rd party types": consider that
        when building and/or typechecking your project there literally is no
        such thing as "3rd party". if you pull in a dependency that has
        problems.. <em>now it's your problem, too</em>. try to think about
        things holistically.
      </Typography>
    </Stack>
  </Step>
);

export const Step0Prerequisites = () => {
  const [open, setOpen] = useState(false);
  const toggleDialog = useCallback(() => {
    setOpen(prev => !prev);
  }, []);

  return (
    <Step step={0}>
      <Button
        startIcon={<InfoOutline />}
        variant="outlined"
        onClick={toggleDialog}
      >
        prerequisites
      </Button>
      <Dialog
        open={open}
        onClose={toggleDialog}
        fullWidth
        maxWidth="md"
        slotProps={{
          paper: {
            sx: {
              background: "#000000a0",
            },
          },
        }}
      >
        <DialogTitle>
          <Typography variant="h4">prerequisites</Typography>
        </DialogTitle>
        <DialogContent>
          <Stack gap={2}>
            <Step step={1}>
              <Stack gap={0.5}>
                <Typography variant="h5">
                  plain ol' <InlineCode>tsc</InlineCode> can run
                </Typography>
                <Typography>
                  lots of projects do lots of fancy things. sure. that's fine.
                  that's normal... but ultimately you need to provide TypeSlayer{" "}
                  <em>some way</em> to run{" "}
                  <InlineCode>tsc --generateTrace</InlineCode> from{" "}
                  <em>some place</em> in your project.
                </Typography>
                <Typography>
                  if you need to customize, click the <Flag /> icon next to the{" "}
                  <InlineCode>tsconfig</InlineCode> config section (step 2 of
                  Start). there you will find an example of exactly one command
                  that TypeSlayer will construct and run. make sure it works
                  normally.
                </Typography>
                <Typography>
                  <em>be wary:</em> caching mechanisms like{" "}
                  <InlineCode>--build</InlineCode> mode,{" "}
                  <InlineCode>--incremental</InlineCode> mode, and composite
                  projects can complicate things. conceptually, you want to do a{" "}
                  <em>cold typecheck</em> (like your CI might, for example)
                  without any of that stuff so you can really see where the time
                  is being spent. otherwise, it won't be very useful.
                </Typography>
              </Stack>
            </Step>{" "}
            <Step step={2}>
              <Stack gap={0.5}>
                <Typography variant="h5">
                  prepare <em>your project's</em> prerequisites
                </Typography>
                <Typography>
                  you need to do all the things like{" "}
                  <InlineCode>npm install</InlineCode> or prebuild any required
                  assets.
                </Typography>
              </Stack>
            </Step>
            <Step step={3}>
              <Stack gap={0.5}>
                <Typography variant="h5">no type errors</Typography>
                <Typography>
                  TypeScript's internal tooling simply can't do a full type
                  analysis if there are errors. counter-intuitively, though,
                  ignoring the error via{" "}
                  <InlineCode>@ts-expect-error</InlineCode> is fine because it's
                  marked and handled separately.
                </Typography>
              </Stack>
            </Step>
            <Alert severity="info">
              did you notice all three of the above steps are basically saying
              the same thing in three different ways? your project needs to have
              some place where you can run{" "}
              <InlineCode>tsc --generateTrace</InlineCode> and process all your
              code without errors.
            </Alert>
            {step4}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={toggleDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Step>
  );
};
