# typeslayer

## How to use

open a terminal in the package you want to explore and then do:

```sh
npx typeslayer
```

That's it.  That will do two things:

1. it will open a localhost webserver with the webapp
2. it will run a server that does all the fancy computations and file access.

## Will I PWN myself if I use this tool in a way other than what was intended (which is, to be clear, strictly for local use)?

Yes.  Seriously yes.  This tool can:

- access any file on your computer (think: directory traversal attack) and serve it
- run unsanitized inputs from package.json scripts (think: remote code execution attack)

Could the architecture be changed such that these things aren't possible?  Who knows.  Probably.  Don't care, though.  It's a local-only tool at the moment and just like you have terminal access to your own computer and there's nothing wrong with that - think of this tool as an extension of what you could do manually with `tsc` and a Node.js repl.

## Why Isn't this just a CLI tool?

- I don't like CLI tools.  I view them as a last resort, at this point in engineering history.
- A goal of the project is show interactive visualizations like treemaps and force graphs
- This involves displaying recursive data structures.  By definition, you can't ever finish the job of printing a recursive data structure to the console because it'd need to loop forever.

## TODO

- allow for configuring default code editor that files open in, right now it's just vscode
