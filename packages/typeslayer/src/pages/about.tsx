import { Box, Divider, Link, Stack, Typography } from "@mui/material";
import { InlineCode } from "@typeslayer/common";
import dimitropoulosAvatar from "../assets/dimitropoulos.png";
import { MITS_DISCORD } from "../components/constants";
import { UsefulLinks } from "../components/useful-links";
import { createOpenHandler } from "../components/utils";

export function AboutPage() {
  return (
    <Box sx={{ px: 4, py: 4, maxWidth: 960, margin: "0 auto" }}>
      <Stack gap={3} sx={{ overflow: "auto" }}>
        <Box>
          <Typography variant="h3">About TypeSlayer</Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Who needs this stupid thing, anyway?
          </Typography>
        </Box>

        <Divider />

        <Typography variant="body1">
          TypeSlayer is one of those things that most developers don't need.
          others might just find it lulzy to play around with.
        </Typography>
        <Typography variant="body1">
          but then there's the power users. the library authors. the people
          attending SquiggleConf. you know the kind.
        </Typography>
        <Typography variant="body1">
          for the people pushing the boundaries of TypeScript (or at companies
          doing so intentionally or not), a tool like this is something we
          haven't seen before. there were ways to trash <em>hours</em> messing
          with multi-hundred-megabyte JSON files. and that's not even counting
          the time required to learn how the TypeScript compiler works so you
          can understand the problem... it's a lot.
        </Typography>
        <Typography variant="body1">
          consider the fact that this can sometimes feel like an impossible task
          for a library author because the code that actually exercises the
          library isn't directly accessible - it's in the <em>library user</em>
          's code (which is usually private).
        </Typography>
        <Typography variant="body1">
          I made TypeSlayer because I learned delulu-levels-of-detail about
          TypeScript performance tuning{" "}
          <Link
            href="https://youtu.be/0mCsluv5FXA"
            onClick={createOpenHandler("https://youtu.be/0mCsluv5FXA")}
          >
            while getting Doom to run in TypeScript types
          </Link>
          , yet many of those techniques are still opaque to most people.
        </Typography>
        <Typography variant="body1">
          I wanted to make it easy for others to put up PRs at their companies
          all like "I increased type-checking perf on this file by 380,000x and
          shaved 23 seconds off every CI run" (real story btw lol). I took what
          I learned about how to debug type performance and wrapped it all up
          into this tool.
        </Typography>
        <Typography variant="body1">hope you enjoy,</Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            marginTop: "4px !important",
          }}
        >
          <img
            src={dimitropoulosAvatar}
            alt="Dimitri Mitropoulos"
            style={{ width: 32, height: 32, marginRight: 8 }}
          />{" "}
          <Box sx={{ display: "flex", flexDirection: "column", marginLeft: 0 }}>
            <span style={{ lineHeight: 1.25 }}>Dimitri Mitropoulos</span>
            <span style={{ fontSize: 12 }}>
              <InlineCode>dimitropoulos</InlineCode>&nbsp;on&nbsp;
              <Link
                href="https://github.com/dimitropoulos"
                onClick={createOpenHandler("https://github.com/dimitropoulos")}
              >
                GitHub
              </Link>
              &nbsp;and&nbsp;
              <Link
                href={MITS_DISCORD}
                onClick={createOpenHandler(MITS_DISCORD)}
              >
                Discord
              </Link>
            </span>
          </Box>
        </Box>
        <Divider />
        <UsefulLinks showGithub />
      </Stack>
    </Box>
  );
}
