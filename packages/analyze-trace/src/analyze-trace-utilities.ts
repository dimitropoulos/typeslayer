// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import fs = require("fs");
import path = require("path");
import countImportExpressions = require("./count-import-expressions");
import normalizePositions = require("./normalize-positions");
import simplify = require("./simplify-type");
import { EventSpan, ParseResult } from "./parse-trace-file";

import jsonstream = require("jsonstream-next");

export function buildHotPathsTree(parseResult: ParseResult, thresholdDuration: number, minPercentage: number): EventSpan {
    const { minTime, maxTime, spans, unclosedStack } = parseResult;

    for (let i = unclosedStack.length - 1; i >= 0; i--) {
        const event = unclosedStack[i];
        spans.push({ event, start: +event.ts, end: maxTime, children: [] });
    }

    spans.sort((a, b) => a.start - b.start);

    const root: EventSpan = { start: minTime, end: maxTime, children: [] };
    const stack = [ root ];

    for (const span of spans) {
        let i = stack.length - 1;
        for (; i > 0; i--) { // No need to check root at stack[0]
            const curr = stack[i];
            if (curr.end > span.start) {
                // Pop down to parent
                stack.length = i + 1;
                break;
            }
        }

        const parent = stack[i];
        const duration = span.end - span.start;
        if (duration >= thresholdDuration || duration >= minPercentage * (parent.end - parent.start)) {
            parent.children.push(span);
            stack.push(span);
        }
    }

    return root;
}

type LineChar = normalizePositions.LineChar;
export type PositionMap = Map<string, Map<string, LineChar>>; // Path to position (offset or LineChar) to LineChar

export async function getNormalizedPositions(root: EventSpan, relatedTypes: Map<number, object> | undefined): Promise<PositionMap> {
    const positionMap = new Map<string, (number | LineChar)[]>();
    recordPositions(root, /*currentFile*/ undefined);
    if (relatedTypes) {
        for (const type of relatedTypes.values()) {
            const location: any = (type as any).location;
            if (location) {
                recordPosition(location.path, [ location.line, location.char ]);
            }
        }
    }

    const map = new Map<string, Map<string, LineChar>>(); // NB: can't use LineChar as map key
    for (const entry of Array.from(positionMap.entries())) {
        try {
            const path = entry[0];
            const sourceStream = fs.createReadStream(path, { encoding: "utf-8" });

            const rawPositions = entry[1];
            const normalizedPositions = await normalizePositions(sourceStream, rawPositions);

            const pathMap = new Map<string, LineChar>();
            for (let i = 0; i < rawPositions.length; i++) {
                const rawPosition = rawPositions[i];
                const key = typeof rawPosition === "number" ? Math.abs(rawPosition).toString() : getLineCharMapKey(...rawPosition as LineChar);
                pathMap.set(key, normalizedPositions[i]);
            }

            map.set(path, pathMap);
        } catch {
            // Not finding a file is expected if this isn't the box on which the trace was recorded.
        }
    }

    return map;

    function recordPositions(span: EventSpan, currentFile: string | undefined): void {
        if (span.event?.name === "checkSourceFile") {
            currentFile = span.event!.args!.path;
        }
        else if (span.event?.cat === "check") {
            const args = span.event.args;
            currentFile = args?.path ?? currentFile;
            if (currentFile) {
                if (args?.pos) {
                    recordPosition(currentFile, args.pos);
                }
                if (args?.end) {
                    recordPosition(currentFile, -args.end); // Negative since end should not be moved past trivia
                }
            }
        }

        for (const child of span.children) {
            recordPositions(child, currentFile);
        }
    }

    function recordPosition(path: string, position: number | LineChar): void {
        if (!positionMap.has(path)) {
            positionMap.set(path, []);
        }

        positionMap.get(path)!.push(position);
    }
}

export function getLineCharMapKey(line: number, char: number) {
    return `${line},${char}`;
}

export async function getPackageVersion(packagePath: string): Promise<string | undefined> {
    try {
        const jsonPath = path.join(packagePath, "package.json");
        const jsonString = await fs.promises.readFile(jsonPath, { encoding: "utf-8" });
        const jsonObj = JSON.parse(jsonString);
        return jsonObj.version;
    }
    catch {
    }

    return undefined;
}

export function unmangleCamelCase(name: string) {
    let result = "";
    for (const char of [...name]) {
        if (!result.length) {
            result += char.toLocaleUpperCase();
            continue;
        }

        const lower = char.toLocaleLowerCase();
        if (char !== lower) {
            result += " ";
        }

        result += lower;
    }
    return result;
}

let typesCache: undefined | readonly any[];
export async function getTypes(typesPath: string): Promise<readonly any[]> {
    if (!typesCache) {
        return new Promise((resolve, _reject) => {
            typesCache = [];

            const readStream = fs.createReadStream(typesPath, { encoding: "utf-8" });
            readStream.on("end", () => {
                resolve(typesCache!);
            });
            readStream.on("error", onError);

            // expects types file to be {object[]}
            const parser = jsonstream.parse("*");
            parser.on("data", (data: object) => {
                (typesCache as any[]).push(data);
            });
            parser.on("error", onError);

            readStream.pipe(parser);

            function onError(e: Error) {
                console.error(`Error reading types file: ${e.message}`);
                resolve(typesCache!);
            }
        });
    }

    return typesCache;
}

export interface EmittedImport {
    name: string;
    count: number;
}

export async function getEmittedImports(dtsPath: string, importExpressionThreshold: number): Promise<EmittedImport[]> {
    const sourceStream = fs.createReadStream(dtsPath, { encoding: "utf-8" });
    const frequency = await countImportExpressions(sourceStream);
    const sorted = Array.from(frequency.entries())
        .sort(([import1, count1], [import2, count2]) => count2 - count1 || import1.localeCompare(import2))
        .filter(([_, count]) => count >= importExpressionThreshold)
        .map(([name, count]) => ({ name, count }));
    return sorted;
}

export async function getRelatedTypes(root: EventSpan, typesPath: string, leafOnly: boolean): Promise<Map<number, object>> {
    const relatedTypes = new Map<number, object>();

    const stack: EventSpan[] = [];
    stack.push(root);

    while(stack.length) {
        const curr = stack.pop()!;
        if (!leafOnly || curr.children.length === 0) {
            if (curr.event?.name === "structuredTypeRelatedTo") {
                const types = await getTypes(typesPath);
                if (types.length) {
                    addRelatedTypes(types, curr.event.args!.sourceId, relatedTypes);
                    addRelatedTypes(types, curr.event.args!.targetId, relatedTypes);
                }
            }
            else if (curr.event?.name === "getVariancesWorker") {
                const types = await getTypes(typesPath);
                if (types.length) {
                    addRelatedTypes(types, curr.event.args!.id, relatedTypes);
                }
            }
        }

        stack.push(...curr.children); // Order doesn't matter during this traversal
    }

    return relatedTypes;
}

function addRelatedTypes(types: readonly object[], id: number, relatedTypes: Map<number, object>): void {
    worker(id);

    function worker(id: any): void {
        if (typeof id !== "number") return;
        const type: any = types[id - 1];
        if (!type) return;

        // If there's a cycle, suppress the children, but not the type itself
        if (!relatedTypes.has(id)) {
            relatedTypes.set(id, simplify(type));

            for (const prop in type) {
                if (prop.match(/type/i)) {
                    if (Array.isArray(type[prop])) {
                        for (const t of type[prop]) {
                            worker(t);
                        }
                    }
                    else {
                        worker(type[prop]);
                    }
                }
            }
        }
    }
}
