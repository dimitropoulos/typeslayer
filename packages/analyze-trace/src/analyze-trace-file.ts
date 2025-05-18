// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import fs = require("fs");
import exit = require("exit");
import yargs = require("yargs");

import { commandLineOptions, checkCommandLineOptions } from "./analyze-trace-options";
import { reportHighlights as reportText } from "./print-trace-analysis-text";
import { reportHighlights as reportJson } from "./print-trace-analysis-json";

const argv = yargs(process.argv.slice(2))
    .command("$0 <tracePath> [typesPath]", "Preprocess tracing type dumps", yargs => yargs
        .positional("tracePath", { type: "string", desc: "Trace file to read", coerce: throwIfNotFile })
        .positional("typesPath", { type: "string", desc: "Corresponding types file", coerce: throwIfNotFile })
        .options(commandLineOptions)
        .check(checkCommandLineOptions)
        .help("h").alias("h", "help")
        .epilog("Exits with code 0 if highlights were found, 1 if no highlights were found, and 2 if an error occurred")
        .strict())
    .argv;


const tracePath = argv.tracePath!;
const typesPath = argv.typesPath;

const thresholdDuration = argv.forceMillis * 1000; // microseconds
const minDuration = argv.skipMillis * 1000; // microseconds
const minPercentage = 0.6;
const importExpressionThreshold = 10;

const reportHighlights = argv.json ? reportJson : reportText;

reportHighlights(tracePath, argv.expandTypes ? typesPath : undefined, thresholdDuration, minDuration, minPercentage, importExpressionThreshold)
  .then(found => exit(found ? 0 : 1))
  .catch(err => {
    console.error(`Internal Error: ${err.message}\n${err.stack}`)
    exit(2);
});

function throwIfNotFile(path: string): string {
    if (!fs.existsSync(path) || !fs.statSync(path)?.isFile()) {
        throw new Error(`${path} is not a file`);
    }
    return path;
}