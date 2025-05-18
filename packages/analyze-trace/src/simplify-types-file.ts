// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import fs = require("fs");
import perf_hooks = require("perf_hooks");
import stream = require("stream");
import util = require("util");
import zlib = require("zlib");

import split = require("split2");
import yargs = require("yargs");

import jsonstream = require("jsonstream-next");

import simplifyType = require("./simplify-type");

const pipeline: (...stream: any[]) => Promise<void> = util.promisify(stream.pipeline);

const args = yargs(process.argv.slice(2))
    .command("$0 <input> <output>", "Preprocess tracing type dumps", yargs => yargs
        .positional("input", { type: "string", desc: "json file to read (possibly compressed)" })
        .positional("output", { type: "string", desc: "json file to write (possibly compressed)" })
        .options({
            "m": {
                alias: "multiline",
                describe: "use true json parsing, rather than assuming each element is on a separate line",
                type: "boolean"
            }
        })
        .help("h").alias("h", "help")
        .strict())
    .argv;

async function processFile(processElement: (element: {}) => readonly {}[]) {
    const stages: any[] = [];

    const inputPath = args.input!;

    stages.push(fs.createReadStream(inputPath));

    if (inputPath.endsWith(".gz")) {
        stages.push(zlib.createGunzip());
    }
    else if (inputPath.endsWith(".br")) {
        stages.push(zlib.createBrotliDecompress());
    }

    if (args.m) {
        const transform = jsonstream.parse("*");

        const oldFlush = transform._flush.bind(transform);
        const newFlush: typeof oldFlush = cb => {
            return oldFlush(err => {
                if (err) {
                    // Incomplete JSON is normal (e.g. crash during tracing), so we swallow errors
                    // and finish writing the output.
                    console.log("Parse error: " + err.message);
                }
                cb();
            });
        };
        transform._flush = newFlush;

        stages.push(transform);
    }
    else {
        stages.push(split(/,?\r?\n/));

        let sawError = false;
        stages.push(new stream.Transform({
            objectMode: true,
            transform(chunk, _encoding, callback) {
                if (!sawError) {
                    try {
                        const obj = JSON.parse(chunk.replace(/^\[/, "").replace(/\]$/, ""));
                        callback(undefined, obj);
                        return;
                    }
                    catch (e) {
                        if (!(e instanceof SyntaxError)) {
                            throw e;
                        }

                        // Incomplete JSON is normal (e.g. crash during tracing), so we swallow errors
                        // and finish writing the output.
                        sawError = true;
                        console.log("Parse error: " + e.message);
                        console.log("\tConsider re-running with '-m'");
                    }
                }

                console.log("\tDropping " + chunk);
                callback();
            },
        }));
    }

    stages.push(new stream.Transform({
        objectMode: true,
        transform(obj, _encoding, callback) {
            const results = processElement(obj);
            if (results && results.length) {
                for (const result of results) {
                    this.push(result);
                }
            }
            callback();
        }
    }));

    let first = true;
    stages.push(new stream.Transform({
        objectMode: true,
        transform(chunk, _encoding, callback) {
            if (first) {
                first = false;
                this.push("[");
            }
            else {
                this.push(",\n");
            }

            this.push(JSON.stringify(chunk));

            callback();
        },
        flush(callback) {
            callback(undefined, "]");
        }
    }));

    const outputPath = args.output!;
    if (outputPath.endsWith(".gz")) {
        stages.push(zlib.createGzip());
    }
    else if (outputPath.endsWith(".br")) {
        stages.push(zlib.createBrotliCompress());
    }

    stages.push(fs.createWriteStream(outputPath));

    await pipeline(stages);
}

async function run() {
    const start = perf_hooks.performance.now();
    let itemCount = 0;
    console.log("Processing...");
    try {
        await processFile(item => (itemCount++, [simplifyType(item)]));
        console.log("Done");
    }
    catch (e: any) {
        console.log(`Error: ${e.message}`);
    }
    console.log(`Processed ${itemCount} items in ${Math.round(perf_hooks.performance.now() - start)} ms`);
}

run().catch(console.error);