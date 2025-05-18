// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import fs = require("fs");

const Parser = require("jsonparse");

const packageNameRegex = /\/node_modules\/((?:[^@][^/]+)|(?:@[^/]+\/[^/]+))/g;

export interface Event {
    ph: string;
    ts: string;
    dur?: string;
    name: string;
    cat: string;
    args?: any;
}

export interface EventSpan {
    event?: Event;
    start: number;
    end: number;
    children: EventSpan[];
}

export interface ParseResult {
    minTime: number;
    maxTime: number;
    spans: EventSpan[];
    unclosedStack: Event[];
    nodeModulePaths: Map<string, string[]>;
}

export function parse(tracePath: string, minDuration: number): Promise<ParseResult> {
    return new Promise<ParseResult>(resolve => {
        const p = new Parser();

        let minTime = Infinity;
        let maxTime = 0;
        const unclosedStack: Event[] = []; // Sorted in increasing order of start time (even when below timestamp resolution)
        const spans: EventSpan[] = []; // Sorted in increasing order of end time, then increasing order of start time (even when below timestamp resolution)
        const nodeModulePaths = new Map<string, string[]>();
        p.onValue = function (value: any) {
            if (this.stack.length !== 1) return;
            if (this.mode !== Parser.C.ARRAY) throw new Error(`Unexpected mode ${this.mode}`);
            this.value = [];

            // Metadata objects are uninteresting
            if (value.ph === "M") return;

            // TODO (https://github.com/microsoft/typescript-analyze-trace/issues/1)
            if (value.ph === "i" || value.ph === "I") return;

            const event = value as Event;

            if (event.ph === "B") {
                unclosedStack.push(event);
                return;
            }

            let span: EventSpan;
            if (event.ph === "E") {
                const beginEvent = unclosedStack.pop()!;
                span = { event: beginEvent, start: +beginEvent.ts, end: +event.ts, children: [] };
            }
            else if (event.ph === "X") {
                const start = +event.ts;
                const duration = +event.dur!;
                span = { event, start, end: start + duration, children: [] }
            }
            else {
                throw new Error(`Unknown event phase ${event.ph}`);
            }

            minTime = Math.min(minTime, span.start);
            maxTime = Math.max(maxTime, span.end);

            // Note that we need to do this before events are being dropped based on `minDuration`
            if (span.event!.name === "findSourceFile") {
                const path = span.event!.args?.fileName;
                if (path) {
                    while (true) {
                        const m = packageNameRegex.exec(path);
                        if (!m) break;
                        const packageName = m[1];
                        const packagePath = m.input.substring(0, m.index + m[0].length);
                        if (nodeModulePaths.has(packageName)) {
                            const paths = nodeModulePaths.get(packageName);
                            if (paths!.indexOf(packagePath) < 0) { // Usually contains exactly one element
                                paths!.push(packagePath);
                            }
                        }
                        else {
                            nodeModulePaths.set(packageName, [ packagePath ]);
                        }
                    }
                }
            }

            if ((span.end - span.start) >= minDuration) {
                spans.push(span);
            }
        }

        const readStream = fs.createReadStream(tracePath);
        readStream.on("data", chunk => p.write(chunk));
        readStream.on("end", () => {
            resolve({
                minTime,
                maxTime,
                spans,
                unclosedStack,
                nodeModulePaths,
            });
        });
    });
}