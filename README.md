# typeslayer

Raw Data

- `trace.json` (from generateTrace)
- `types.json` (from generateTrace)
- analyze-trace output
- profile.cpuprofile
- build outputs

## Why Isn't this just a CLI tool?

- I don't like CLI tools.  I view them as a last resort, at this point in engineering history.
- A goal of the project is show interactive visualizations like heatmaps and force graphs
- This involves displaying recursive data structures.  By definition, you can't ever finish the job of printing a recursive data structure to the console because it'd need to loop forever.

## TODO

- allow for configuring default code editor
