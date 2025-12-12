import { ExpandMore } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";
import { Code } from "../components/code";
import { InlineCode } from "../components/inline-code";

const DocItem = ({
  title,
  description,
}: {
  title: ReactNode;
  description: ReactNode;
}) => {
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography variant="h6">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography>{description}</Typography>
      </AccordionDetails>
    </Accordion>
  );
};

export const DocsPage = () => {
  const docItems = [
    {
      id: "my-code",
      title: '"but I just want to see my code"',
      description: (
        <Stack gap={1}>
          <Typography>
            in the context of diagnosing performance problems this is definitely
            wrongthink. please do see the{" "}
            <Link href="/start">Start page prerequisites</Link> for the reasons
            why.
          </Typography>
          <Typography>
            if you don't believe me, I won't try to save you from yourself...
            some TypeSlayer users have skirted around things by adding{" "}
            <InlineCode>skipLibCheck</InlineCode> and/or{" "}
            <InlineCode>skipDefaultLibCheck</InlineCode> to their{" "}
            <InlineCode>tsconfig.json</InlineCode>.
          </Typography>
          <Typography>but again, it's your funeral...</Typography>
        </Stack>
      ),
    },
    {
      id: "anonymous",
      title: (
        <Typography variant="h6">
          why do I see lots of <InlineCode>&lt;anonymous&gt;</InlineCode>{" "}
          everywhere?
        </Typography>
      ),
      description: (
        <Stack gap={1}>
          <Typography>that's the world we're livin' in.</Typography>
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
        <Typography variant="h6">
          what about <InlineCode>tsgo</InlineCode>?
        </Typography>
      ),
      description: (
        <Stack gap={1}>
          <Typography>
            while I expect{" "}
            <Link href="https://github.com/microsoft/typescript-go">
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
            you can still use <InlineCode>tsc</InlineCode> to get the same
            information whether or not you're already on{" "}
            <InlineCode>tsgo</InlineCode>.
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
        <Typography variant="h6">
          what about <InlineCode>Svelte</InlineCode> or{" "}
          <InlineCode>Vue</InlineCode>?
        </Typography>
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
        </Stack>
      ),
    },
    {
      id: "data-storage",
      title: (
        <Typography variant="h6">
          where does TypeSlayer store my data?
        </Typography>
      ),
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
      title: (
        <Typography variant="h6">
          how sensitive is the data in the outputs?
        </Typography>
      ),
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
      title: <Typography variant="h6">does TypeSlayer track me?</Typography>,
      description: (
        <Stack gap={1}>
          <Typography>
            no. TypeSlayer has no network activity whatsoever.
          </Typography>
          <Typography>
            if you're submitting a bug report, we might ask for some of your
            trace files to help us debug the issue. but that's it.
          </Typography>
          <Typography>
            consider the door always open for the future, though. there's no
            evil empire here, but it might be useful in the future to implement
            some very basic "someone somewhere ran it at this time" diagnostics
            in the future or perhaps even some very very basic crash reporting.
          </Typography>
        </Stack>
      ),
    },
  ];

  return (
    <Stack
      sx={{
        p: 4,
        overflow: "auto",
        gap: 3,
        maxHeight: "100%",
        minHeight: "100%",
      }}
    >
      <Typography variant="h2">Docs</Typography>

      <Stack maxWidth={500}>
        {docItems.map(item => (
          <DocItem
            key={item.id}
            title={item.title}
            description={item.description}
          />
        ))}
      </Stack>
    </Stack>
  );
};
