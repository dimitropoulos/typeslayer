import Pause from "@mui/icons-material/Pause";
import {
  Box,
  Divider,
  Link,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "@tanstack/react-router";
import { InlineCode } from "@typeslayer/common";
import { useState } from "react";
import { Code } from "../components/code";
import { UsefulLinks } from "../components/useful-links";
import { createOpenHandler } from "../components/utils";
import { Step } from "./start/step";
import { step4 } from "./start/step-0-prerequisites";

export const DocsPage = () => {
  const docItems = [
    {
      id: "my-code",
      title: <span>"but I just want to see my code"</span>,
      description: (
        <Stack gap={1}>
          <Typography gutterBottom>
            here's a reminder from step 4 of the prerequisites in{" "}
            <Link href="/start">Start</Link>
          </Typography>
          {step4}
          <Divider sx={{ my: 2 }} />
          <Typography>
            in the context of diagnosing performance problems wanting to filter
            by "your code" is definitely wrongthink.
          </Typography>
          <Typography>
            if you don't believe me, I won't try to save you from yourself...
            some TypeSlayer users have skirted around things by adding{" "}
            <InlineCode>skipLibCheck</InlineCode> and/or{" "}
            <InlineCode>skipDefaultLibCheck</InlineCode> to their{" "}
            <InlineCode>tsconfig.json</InlineCode> (or via the corresponding
            command line flags).
          </Typography>
          <Typography>but again, it's your funeral...</Typography>
          <Typography>
            think of it this way{" "}
            <small>(I'm from Michigan, so excuse the car analogy)</small>: if
            you were on a team making the engine for a car, and you were trying
            to understand the gas mileage of the vehicle, would you go about
            this by taking a prototype of the car and removing all the seats,
            doors, and exterior panels? like... because you just make the engine
            so that's all you need to look at... right? see what I mean?
          </Typography>
          <Typography>
            and, feel free to tell me why I'm wrong, I can take it. I'd actually
            be curious to hear your thoughts. maybe there is a legit use-case
            I'm totally missing.
          </Typography>
          <Typography>
            usually people say "well I can't control what's going on in 3rd
            party dependencies" to which I say: refer to the prior point from
            the prerequisites about there being no such thing as 3rd party code
            by the time of typechecking.
          </Typography>
          <Typography>
            but for another thing, you{" "}
            <em>
              very much are in <strong>direct</strong> control of it
            </em>{" "}
            unless of course someone is holding you against your will to force
            dependencies into your project, to which I'd say your priority
            should be to get out of that abusive relationship.
          </Typography>
        </Stack>
      ),
    },
    {
      id: "anonymous",
      title: (
        <span>
          why do I see lots of <InlineCode>&lt;anonymous&gt;</InlineCode>{" "}
          everywhere?
        </span>
      ),
      description: (
        <Stack gap={1}>
          <Typography>
            you live in a world where some types don't have names. it's actually{" "}
            <Link
              href="https://worrydream.com/AlligatorEggs"
              onClick={createOpenHandler(
                "https://worrydream.com/AlligatorEggs",
              )}
            >
              a good thing
            </Link>
          </Typography>
          <Typography>
            although you may not think of them as distinct types, consider
            something like this:
          </Typography>
          <Code
            lang="typescript"
            value={`type Colors = ["red","green","blue"];`}
          />
          <Typography>how many types are there? four.</Typography>
          <Typography>
            <InlineCode>Colors</InlineCode> is a named tuple, but from the
            perspective of the compiler there's also three inlined literal
            string types,
            <InlineCode>"red"</InlineCode>, <InlineCode>"green"</InlineCode>,
            and <InlineCode>"blue"</InlineCode>. those types never got names.
          </Typography>
          <Typography>
            you could have given them names. that'd look like this:
          </Typography>
          <Code
            lang="typescript"
            value={`type Red = "red";\ntype Green = "green";\ntype Blue = "blue";\ntype Colors = [Red, Green, Blue];`}
          />
          <Typography>
            but you didn't give them names, did you? no. you didn't.
          </Typography>
          <Typography>
            in language parlance, that'd qualify them as an "anonymous types" in
            the same way that the arrow function in
          </Typography>
          <Code lang="typescript" value={"someArray.map(x => x + 1)"} />
          <Typography> is also anonymous.</Typography>
          <Typography>
            to cheat a bit: when it's a literal value (like a string literal,
            number literal, boolean literal, etc.), TypeSlayer will, we just
            show you the literal value <em>as though it were the name</em>.
            unfortunately, this trick doesn't work with template literal types
            because their display values are not recorded by TypeScript in the
            trace files - it'd be super sweet if they were though.
          </Typography>
          <Typography>
            but sometimes, try as one might, there's just no material way to
            "spell" the type in question. it's more common than you might
            realize, and in those situations all we can do is fallback to
            showing <InlineCode>&lt;anonymous&gt;</InlineCode> as a placeholder
            in the TypeSlayer UI.
          </Typography>
        </Stack>
      ),
    },
    {
      id: "tsgo",
      title: (
        <span>
          what about <InlineCode>tsgo</InlineCode>?
        </span>
      ),
      description: (
        <Stack gap={1}>
          <Typography>
            while I hope and expect{" "}
            <Link
              href="https://github.com/microsoft/typescript-go"
              onClick={createOpenHandler(
                "https://github.com/microsoft/typescript-go",
              )}
            >
              TypeScript-Go
            </Link>{" "}
            will have the <InlineCode>--generateTrace</InlineCode> flag (which
            TypeSlayer requires), it currently does not.
          </Typography>
          <Typography>
            we, here at TypeSlayer Inc., like to think that this flag hadn't yet
            been prioritized because... well.. it wasn't especially useful or
            easy to use before. that's like, the whole reason, like, that
            TypeSlayer was made.. so TypeSlayer's existence gives some
            much-needed motivation for keeping the flag around (we hope).
          </Typography>
          <Typography>
            so in the meantime, if you're looking for a way to generate trace,
            <strong>
              you can still use <InlineCode>tsc</InlineCode> to get the same
              type relations information whether or not you're already on{" "}
              <InlineCode>tsgo</InlineCode>
            </strong>
            .
          </Typography>
          <Typography>
            after all, the trace file reports information about the types in
            your source code, independent from the compiler used to generate it.
            it's a representation of the type information in your code, not the
            compiler that generated it - so it ultimately shouldn't deeply
            matter if <InlineCode>tsgo</InlineCode> has the flag or not for the
            near term.
          </Typography>
        </Stack>
      ),
    },
    {
      id: "botique-frameworks",
      title: (
        <span>
          what about <InlineCode>Svelte</InlineCode> or{" "}
          <InlineCode>Vue</InlineCode>?
        </span>
      ),
      description: (
        <Stack gap={1}>
          <Typography>
            TypeSlayer is built on top of the TypeScript compiler, which means
            it works with any framework or library that uses{" "}
            <InlineCode>tsc</InlineCode> to typecheck can use TypeSlayer.
          </Typography>
          <Typography>
            that said it seems like it requires extra work to be able to
            directly call <InlineCode>tsc</InlineCode> with the{" "}
            <InlineCode>--generateTrace</InlineCode> flag. that's a
            prerequisites.
          </Typography>
          <Typography>
            for the case of Vue, there's an option in the{" "}
            <InlineCode>Customize Flags</InlineCode> area of the Setup to use{" "}
            <InlineCode>vue-tsc</InlineCode> instead of regular{" "}
            <InlineCode>tsc</InlineCode>. can't make too many promises about
            downstream/fractured ecosystem tools like that, but hey maybe it'll
            work.
          </Typography>
          <Typography>
            as for Svelte, I don't know much about it so how about you tell me
            what it needs?
          </Typography>
        </Stack>
      ),
    },
    {
      id: "data-storage",
      title: <span>where does TypeSlayer store my data?</span>,
      description: (
        <Stack gap={1}>
          <Stack>
            <Typography>
              Linux: <InlineCode>~/.local/share/typeslayer/</InlineCode>
            </Typography>
            <Typography>
              macOS:{" "}
              <InlineCode>~/Library/Application Support/typeslayer/</InlineCode>
            </Typography>
            <Typography>
              Windows: <InlineCode>%APPDATA%\typeslayer\</InlineCode>
            </Typography>
          </Stack>
          <Typography>
            then, from those locations, the outputs are stored in a{" "}
            <InlineCode>./outputs</InlineCode> directory.
          </Typography>
        </Stack>
      ),
    },
    {
      id: "data-sensitivity",
      title: <span>how sensitive is the data in the outputs?</span>,
      description: (
        <Stack gap={1}>
          <Typography>
            it's about as tame as data can get. if you're worried about your
            source code being exposed, you can rest easy. the trace files are
            generated by the TypeScript compiler, which means they contain only
            information about the types in your code, not the actual code
            itself.
          </Typography>
          <Typography>
            for that matter, too, all the data is stored in plaintext json so
            you can easily take a peek and see what exactly is in there
          </Typography>
          <Typography>
            playing devil's advocate: the only even-potentially sensitive
            information in the trace files is the file paths of your source code
            files and the names of your types.
          </Typography>
          <Typography>
            so if you're submitting a bug report and worried about getting in
            trouble with your employer, please ask first. that'd be a mondo
            bummer if you lost your job over trying to improve type performance,
            of all things.
          </Typography>
        </Stack>
      ),
    },
    {
      id: "data-tracking",
      title: <span>does TypeSlayer track me?</span>,
      description: (
        <Stack gap={1}>
          <Typography>
            yep! but only super anonymous data (in fact, the same data used to
            power the leaderboard). if that bothers you then you can turn it off
            with <InlineCode>--disable-analytics</InlineCode> or{" "}
            <InlineCode>TYPESLAYER_DISABLE_ANALYTICS=true</InlineCode> or
            setting <InlineCode>settings.disableAnalytics=true</InlineCode> in
            your <InlineCode>typeslayer.toml</InlineCode>.
          </Typography>
          <Typography>
            there's no evil empire here: it's very useful to have very basic
            "someone somewhere ran it at this time" diagnostics along with some
            some very very basic crash reporting.
          </Typography>
          <Typography>
            it couldn't be more transparent: the settings page shows an example
            of exactly what's sent for each event individually. so, if you
            consider things like "the number of types in your project" to be
            secret (completely independent of any way to link it back to you or
            your project) (??????) then in this case you really can "shut that
            whole thing down" (as the politicians say).
          </Typography>
        </Stack>
      ),
    },
    {
      id: "type-graph-moving",
      title: <span>why does the Type Graph keep moving?</span>,
      description: (
        <Stack gap={1}>
          <Typography>
            the Type Graph is a thing called a "force directed graph". it's a
            way of visualizing a graph where the nodes (in this case, your
            types) are connected by edges (in this case, the relationships
            between your types) via a physics simulation. the nodes are
            positioned based on the strength of the connections between them.
          </Typography>
          <Typography>
            the reason it's always moving is that the layout of the nodes is
            constantly being updated based on the strength of the connections
            between the nodes. the layout algorithm is designed to minimize the
            overall energy of the system, which means that the nodes are
            constantly moving towards a more stable configuration.
          </Typography>
          <Typography>
            eventually, the nodes will settle into a stable configuration
            (unless you change the filters, which will cause new/different
            forces to be in play, and thus get everything moving again).
          </Typography>
          <Typography>
            if that makes you wonder: "why can't you just have it start on the
            stable layout", then consider that it's <em>a live simulation</em>,
            which means that the to display the stable equilibrium state for a
            given set of filters you'd have to wait for the simulation to run
            until it reaches a stable state, which could take a while. so while
            it's equalizing... you might as well just see it in action. and
            that's exactly what it does.
          </Typography>
          <Divider />
          <Typography>
            if you want to stop the movement, you can click on the{" "}
            <Pause fontSize="small" /> (pause) icon in the top right corner of
            the Type Graph view. this will lock the current layout and prevent
            the nodes from moving.
          </Typography>
          <Typography>
            you can also hold your spacebar down to pause the movement of the
            nodes temporarily.
          </Typography>
        </Stack>
      ),
    },
    {
      id: "testing-libraries",
      title: <span>how is testing a library different?</span>,
      description: (
        <Stack gap={1}>
          <Typography>
            benchmarking the performance of types is actually quite akin to any
            other kid of performance testing. if I have a function in my
            library, let's say, and I want to test that function's performance..
            what do I do? how do I do that? well.. I have to call the function.
            right?
          </Typography>
          <Typography>
            the "meta" of this whole "TypeScript types performance" thing is
            ultimately thinking about types as functions. for example a type
            with no generics is sorta like a function with no parameters. a type
            with one generic is sorta like a function with one parameter. and so
            on. that's what people mean when they say "type-level programming".
          </Typography>
          <Typography>
            so... to observe the real-world performance of your types, you have
            to make sure you're actually "calling" them, like a user might.
          </Typography>
          <Typography>
            in the simplest of terms, that could mean making sure that
            TypeSlayer is being passed the unit tests for your library, since
            there is where you're actually calling your library's types.
          </Typography>
          <Typography>
            but in more broad terms,{" "}
            <strong>
              it might be best to test your library by running TypeSlayer on a
              different real-world project that uses your library.
            </strong>{" "}
            that way you can ensure you're getting an accurate picture of how
            your types perform in a real-world scenario (exactly like you would
            want to do with any other kind of performance testing).
          </Typography>
        </Stack>
      ),
    },
    {
      id: "overwhelmed",
      title: <span>this is a lot. where do I start?</span>,
      description: (
        <Stack gap={2}>
          <Typography>ask yourself these questions:</Typography>
          <Step step={1}>
            <Stack direction="column" gap={1}>
              <Typography variant="h5">
                is there <em>actually</em> a problem?
              </Typography>
              <Typography>
                don't walk into any performance or analysis tool with
                preconceived notions. your goal is the pursuit of data and
                evidence. granted "my editor is slow" could absolutely be a
                piece of evidence - but that in itself is not enough. for
                example maybe it's slow because of an extension. now, if you add
                "my editor is slow and the CI is also slow and running{" "}
                <InlineCode>tsc</InlineCode> on the command line is slow" then
                you've got a good start.
              </Typography>
              <Typography>
                do, though, go into this ready to accept the possibility that
                nothing is wrong (unless you have aforementioned evidence).
              </Typography>
            </Stack>
          </Step>
          <Step step={2}>
            <Stack direction="column" gap={1}>
              <Typography variant="h5">
                is there an outlier in the <Link href="/treemap">Treemap</Link>?
              </Typography>
              <Typography>
                the treemap view is a great place to start. if there's one (or a
                few) rectangles that are <em>much larger</em> than the rest..
                that's a great place to start.
              </Typography>
              <Typography>
                make sure you understand, though, that these files may not be
                the specific files where you need to fix your types.{" "}
                <em>
                  they might just be the first file to import the file (perhaps
                  many times removed, down the chain).
                </em>
              </Typography>
            </Stack>
          </Step>
          <Step step={3}>
            <Stack direction="column" gap={1}>
              <Typography variant="h5">
                does anything look weird in{" "}
                <Link href="/perfetto">Perfetto</Link>?
              </Typography>
              <Typography>
                yes, flamegraphs (which is the name of the graph Perfetto shows)
                can be intimidating - but they're such a powerful tool because
                you can quickly spot abnormalities. let's say you have a bunch
                of spans (that's the technical terms for all the little boxes)
                that are roughly equal in size and then there's one big huge one
                that dominates the rest. you're human (presumably) so use your
                highly advanced human skill of pattern matching (which,
                tragically,{" "}
                <Link
                  href="https://github.com/tc39/proposal-pattern-matching"
                  onClick={createOpenHandler(
                    "https://github.com/tc39/proposal-pattern-matching",
                  )}
                >
                  JavaScript still doesn't have
                </Link>
                ).
              </Typography>
              <Typography>
                once you've found a type (it'll show up in{" "}
                <InlineCode>args</InlineCode> under{" "}
                <InlineCode>sourceId</InlineCode> or{" "}
                <InlineCode>targetId</InlineCode>) you can start to investigate
                by taking that type id number and dropping it into the{" "}
                <Link href="/search">Search</Link> module.
              </Typography>
            </Stack>
          </Step>
          <Step step={4}>
            <Stack direction="column" gap={1}>
              <Typography variant="h5">
                are there any <Link href="/award-winners">Award Winners</Link>{" "}
                that stand out?
              </Typography>
              <Typography>
                what does "stand out" mean? don't ask yourself "how big is a
                union that's <em>too big</em>" ask yourself "is there a union
                that's considerably larger than all the rest". that kind of
                logic goes for all the type metrics and type relation metrics.
                that's why they all have little red bars underneath - to show
                you <em>relative scale</em> to other items in that list.
              </Typography>
              <Typography>
                beyond that, look for type-level limits that are being reached
                in your project that were errors but someone ignored with{" "}
                <InlineCode>@ts-ignore</InlineCode> or{" "}
                <InlineCode>@ts-expect-error</InlineCode>. these are definitely
                things you want to address, whether or not you're concerned with
                slowness.
              </Typography>
            </Stack>
          </Step>
          <Step step={5}>
            <Stack direction="column" gap={1}>
              <Typography variant="h5">
                sometimes, you still gotta RTFM
              </Typography>
              <Typography>
                if you feel lost <em>conceptually speaking</em>, you might need
                to take a few minutes and read through TypeScript's own
                documentation on performance tracing.
              </Typography>
              <UsefulLinks />
            </Stack>
          </Step>
        </Stack>
      ),
    },
    {
      id: "consulting",
      title: <span>can I pay you to help me? 💸</span>,
      description: (
        <Stack gap={1}>
          <Typography>
            not me, Dimitri. I'm happily employed and not taking consulting gigs
            at the moment.
          </Typography>
          <Typography>
            <em>HOWEVZ</em> - Michigan TypeScript does have a small private
            program with some (currently 3) extremely excellent TypeScript
            experts that do consulting for exactly this kind of thing. I can
            promise they're the best from personal experience because it's their
            shoulder's that I cry on when I'm fighting with some arcane module
            resolution problem.
          </Typography>
          <Typography>
            of course, they're not cheap (
            <Link
              href="https://youtu.be/jE53O1PzmNU"
              onClick={createOpenHandler("https://youtu.be/jE53O1PzmNU")}
            >
              see
            </Link>
            ), partly because they're literally the best in the world at this
            stuff (you probably know their names and you definitely know their
            work) - but I'm happy to connect you (enough people ask that we
            formed this small group).
          </Typography>
          <Typography>
            if and only if you're extremely interested:{" "}
            <Link href="/about">hollatcha boy</Link>.
          </Typography>
        </Stack>
      ),
    },
    {
      id: "postinstall",
      title: <span>but I refuse to run postinstall scripts..</span>,
      description: (
        <Stack gap={1}>
          <Typography>
            well lucky you, because although the{" "}
            <InlineCode>npx typeslayer</InlineCode> command does run a tiny
            postinstall script - all it does is download the TypeSlayer binary
            for your platform.
          </Typography>
          <Typography>
            if you don't want to run that script, you can always just run the
            platform-specific binary directly. you can find the download links
            for all platforms by{" "}
            <Link
              href="https://www.npmjs.com/search?q=%40typeslayer"
              onClick={createOpenHandler(
                "https://www.npmjs.com/search?q=%40typeslayer",
              )}
            >
              searching <InlineCode>@typeslayer</InlineCode> on npm.
            </Link>
          </Typography>
          <Typography>
            for example you can do{" "}
            <InlineCode>npx @typeslayer/linux-x64</InlineCode> on Linux,{" "}
            <InlineCode>npx @typeslayer/darwin-x64</InlineCode> on Apple
            Silicon, or <InlineCode>npx @typeslayer/win32-x64</InlineCode> on
            Windows.
          </Typography>
        </Stack>
      ),
    },
    {
      id: "y-not-cli",
      title: <span>why isn't this a CLI tool?</span>,
      description: (
        <Stack gap={1}>
          <Typography>
            a goal of the project is show intuitive/beautiful interactive
            visualizations like treemaps and force graphs, inherently not
            something a terminal can provide.
          </Typography>
          <Typography>
            I don't like CLI tools. I view them as a last resort, at this point
            in engineering history. if you're someone that stays up late into
            the night staring at your dotfiles from neovim... I'm happy for you.
            be happy for me too?
          </Typography>
        </Stack>
      ),
    },
    {
      id: "monorepo",
      title: <span>how do I use this with a monorepo?</span>,
      description: (
        <Stack gap={1}>
          <Typography>one step at a time.</Typography>
          <Typography>
            down, Lassie. right now, TypeSlayer is very single-package focused.
          </Typography>
          <Typography>
            that will have to change in the future for the very-simple reason
            that the people that need this tool the most are often the ones with
            monorepos.
          </Typography>
          <Typography>
            but for now, please just pick one package in your monorepo to
            analyze at a time.
          </Typography>
          <Typography>
            when you do, though, don't forget that you can just as easily run{" "}
            <InlineCode>tsc --generateTrace</InlineCode> manually on every
            package in your monorepo, and then gather all the traces and sort
            them by file size. it's almost a guarantee that the ones at the top
            of that list are the ones you most care about anyway.
          </Typography>
        </Stack>
      ),
    },
    {
      id: "manual-mode",
      title: <span>what if I already have trace files?</span>,
      description: (
        <Stack gap={1}>
          <Typography>
            if you already have the <InlineCode>trace.json</InlineCode> and{" "}
            <InlineCode>types.json</InlineCode> files generated from previous
            runs of <InlineCode>tsc --generateTrace</InlineCode>, you can still
            use TypeSlayer. I'm reluctant to give you these instructions because
            if <em>the reason</em> you didn't use TypeSlayer to generate the
            trace is that something is wrong with TypeSlayer, I'd really like to
            know about it. Consider these instructions a last resort.
          </Typography>
          <Typography>
            so whatch'yer gonna do is take your trace files and navigate to{" "}
            <Link href="/raw-data/trace-json">Raw Data | trace.json</Link> .
            there, you'll find an <InlineCode>Upload</InlineCode> button. the{" "}
            <InlineCode>trace.json</InlineCode> and{" "}
            <InlineCode>types.json</InlineCode> files are always a pair, so you
            if you upload one of them, TypeSlayer will find the other that
            matches it.
          </Typography>
          <Typography>
            once that completes, go to{" "}
            <Link href="/raw-data/analyze-trace">
              Raw Data | analyze-trace.json
            </Link>{" "}
            and{" "}
            <Link href="/raw-data/type-graph">Raw Data | type-graph.json</Link>{" "}
            and hit the <InlineCode>Regenerate</InlineCode> button on both of
            those pages.
          </Typography>
          <Typography>
            (and if you have a cpu profile, then upload that - but the only
            module that uses that is SpeedScope, so it's not strictly necessary
            the way the other files are).
          </Typography>
        </Stack>
      ),
    },
  ];

  const params = useParams({ strict: false });
  const navigate = useNavigate();

  let routeDerivedIndex = 0;
  if (params.docId) {
    const index = docItems.findIndex(({ id }) => id === params.docId);
    if (index !== -1) {
      routeDerivedIndex = index;
    }
  }

  const [hoveredPage, setHoveredPage] = useState<number | null>(null);
  const activeIndex = hoveredPage !== null ? hoveredPage : routeDerivedIndex;
  const selected =
    docItems[hoveredPage !== null ? hoveredPage : routeDerivedIndex];

  return (
    <Stack
      sx={{
        minWidth: 500,
        minHeight: 500,
        alignItems: "flex-start",
        flexGrow: 1,
        flexDirection: "row",
        height: "100%",
        display: "flex",
      }}
    >
      <List
        sx={{
          minWidth: 425,
          maxWidth: 425,
          whiteSpace: "nowrap",
          overflow: "auto",
          height: "100%",
          borderRight: 1,
          borderColor: "divider",
        }}
      >
        <ListSubheader>Docs</ListSubheader>
        {docItems.map(({ id, title }, index) => (
          <ListItemButton
            key={id}
            onClick={() => navigate({ to: `/docs/${id}` })}
            onMouseEnter={() => setHoveredPage(index)}
            onMouseLeave={() => setHoveredPage(null)}
            selected={routeDerivedIndex === index}
          >
            <ListItemText>
              <Typography
                variant="h6"
                sx={{
                  ...(activeIndex === index
                    ? { fontWeight: "bold", letterSpacing: "-0.033em" }
                    : { fontWeight: "normal" }),
                }}
              >
                {title}
              </Typography>
            </ListItemText>
          </ListItemButton>
        ))}
      </List>

      <Box
        sx={{
          flexGrow: 1,
          height: "100%",
          overflow: "auto",
          px: 4,
          py: 4,
          width: "100%",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontSize: "1.5rem",
            color: "text.primary",
            mb: 2,
          }}
        >
          {selected.title}
        </Typography>
        <Box maxWidth={700}>{selected.description}</Box>
      </Box>
    </Stack>
  );
};
