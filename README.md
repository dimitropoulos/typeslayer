
<p align="center">
  <img src="packages/typeslayer/src/assets/typeslayer-nightmare.png">
</p>

<p align="center">
  a tool for diagnosing and fixing TypeScript performance problems
</p>

## Quickstart

run:

```bash
npx typeslayer
```

in the root package you want to inspect (i.e. colocated to your package.json). The tool will:

1. start a local web UI,
2. run TypeScript tooling to produce traces and CPU profiles
3. provide interactive visualizations (treemaps, force graphs, speedscope/perfetto views) that you can use to identify problems

## Frequently Asked Questions

- will this ever get CI support for analysis file generation?
  - yeah prolly eventually.
- will this support monorepos?
  - that's the hope.  one step at a time.
- why isn't this just a CLI tool?
  - a goal of the project is show intuitive/beautiful interactive visualizations like treemaps and force graphs, inherently not something a terminal can provide.
  - I don't like CLI tools.  I view them as a last resort, at this point in engineering history.  if you're someone that stays up late into the night staring at your dotfiles from neovim... I'm happy for you.  be happy for me too?
- will this work with ts-go?
  - that's the hope but it ain't ready yet on the ts-go side

# Who needs this stupid thing, anyway?

TypeSlayer is one of those things that most developers don't need.  others might just find it lulzy to play around with.

but then there's the power users. the library authors. the people attending SquiggleConf. you know the kind.

for the people pushing the boundaries of TypeScript (or at companies doing so intentionally or not), a tool like this is something we haven't seen before. there were ways to trash _hours_ messing with multi-hundred-megabyte JSON files. and that's not even counting the time required to learn how the TypeScript compiler works so you can understand the problem... it's a lot.

consider the fact that this can sometimes feel like an impossible task for a library author because the code that actually exercises the library isn't directly accessible - it's in the _library user_'s code (which is usually private).

I made TypeSlayer because I learned delulu-levels-of-detail about TypeScript performance tuning [while getting Doom to run in TypeScript types](https://youtu.be/0mCsluv5FXA), yet many of those techniques are still opaque to most people.

I wanted to make it easy for others to put up PRs at their companies all like "I increased type-checking perf on this file by 380,000x and shaved 23 seconds off every CI run" (real story btw lol). I took what I learned about how to debug type performance and wrapped it all up into this tool.

## Data / Security

TypeSlayer supports Linux x64, macOS x64 (Intel), macOS ARM64 (Apple Silicon), and Windows x64.  Please note that next year is the year of the Linux desktop.

TypeSlayer currently does not collect any analytics - although it probably will try to collect "someone somewhere ran it at XYZ timestamp" data in the future.  all data is stored:

- Linux: `~/.local/share/typeslayer/`
- macOS: `~/Library/Application Support/typeslayer/`
- Windows: `%APPDATA%\typeslayer\`

TypeSlayer can read any file the running user can read and it can run package.json scripts (so treat it as you would your terminal).

## Contributing

1. all commits (and therefor PR merges) must be the next bar from "My Name Is" by Eminem, until further notice
2. no further requirements

## Thank You

this app is built with Tauri, TanStack, Vite, Biome, React, MUI, Rust, and of course, TypeScript.
