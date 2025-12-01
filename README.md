
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
  - A goal of the project is show intuitive/beautiful interactive visualizations like treemaps and force graphs, inherently not something a terminal can provide.
  - I don't like CLI tools.  I view them as a last resort, at this point in engineering history.  If you're someone that stays up late into the night staring at your dotfiles from neovim... I'm happy for you.  Be happy for me too?
- will this work with ts-go?
  - that's the hope but it ain't ready yet on the ts-go side

## Data / Security

TypeSlayer supports Linux x64, macOS x64 (Intel), macOS ARM64 (Apple Silicon), and Windows x64.  Please note that next year is the year of the Linux desktop.

TypeSlayer currently does not collect any analytics - although it probably will try to collect "someone somewhere ran it at XYZ timestamp" data in the future.  All data is stored:

- Linux: `~/.local/share/typeslayer/`
- macOS: `~/Library/Application Support/typeslayer/`
- Windows: `%APPDATA%\typeslayer\`

This tool can read any file the running user can read and it can run package.json scripts (so treat it as you would your terminal).

## Contributing

1. all commits (and therefor PR merges) must be the next bar from "My Name Is" by Eminem, until further notice
2. no further requirements

## Thank You

This app is built with Tauri, TanStack, Vite, React, MUI, and of course, TypeScript.
