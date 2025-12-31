
<p align="center">
  <img src="https://raw.githubusercontent.com/dimitropoulos/typeslayer/main/packages/typeslayer/src/assets/typeslayer-nightmare.png" alt="TypeSlayer">
</p>

<p align="center">
  a tool for diagnosing and fixing TypeScript performance problems</br>the nice thing is, you can't hide from TypeSlayer (even if you <code>//@ts-ignore</code> or <code>//@ts-expect-error</code>)
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

see: [FAQ](https://github.com/dimitropoulos/typeslayer/blob/main/FAQ.md)

## Support

TypeSlayer supports Linux x64 (glibc 2.39+), macOS ARM64 (Apple Silicon), and Windows x64.  Please note that next year is the year of the Linux desktop 📯.

## Security

TypeSlayer currently does not collect any analytics - although it probably will try to collect "someone somewhere ran it at XYZ timestamp" data in the future (or possibly crashlytics).  If that day comes, of course you'll be able to opt out (including before app boot via config).

Actually TypeSlayer is a fully offline app - it does not make any network requests.

## Contributing

1. all commits (and therefor PR merges) must be the next bar from ~~"My Name Is" (complete)~~ "The Real Slim Shady" by Eminem, until further notice
2. no further requirements

## Thank You

this app is built with Tauri, TanStack, Vite, Biome, React, MUI, Rust, and of course, TypeScript.
