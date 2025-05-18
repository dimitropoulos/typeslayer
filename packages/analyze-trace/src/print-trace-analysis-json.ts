// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { assert } from "console";
import fs = require("fs");
import path = require("path");

import { EventSpan, parse } from "./parse-trace-file";
import { buildHotPathsTree, EmittedImport, getEmittedImports, getLineCharMapKey, getNormalizedPositions, getPackageVersion, getRelatedTypes, getTypes, PositionMap, unmangleCamelCase } from "./analyze-trace-utilities";

export async function reportHighlights(
    tracePath: string,
    typesPath: string | undefined,
    thresholdDuration: number,
    minDuration: number,
    minPercentage: number,
    importExpressionThreshold: number): Promise<boolean> {

    const parseResult = await parse(tracePath, minDuration);

    const root = buildHotPathsTree(parseResult, thresholdDuration, minPercentage);

    const result = {};

    const unclosedEvents = parseResult.unclosedStack;
    unclosedEvents.reverse();
    result["unterminatedEvents"] = undefinedIfEmpty(unclosedEvents);

    const hotSpots = await getHotSpots(root, importExpressionThreshold, typesPath);
    result["hotSpots"] = undefinedIfEmpty(hotSpots);

    const duplicatePackages = await getDuplicateNodeModules(parseResult.nodeModulePaths);
    result["duplicatePackages"] = undefinedIfEmpty(duplicatePackages);

    console.log(JSON.stringify(result, undefined, 2));

    return !!hotSpots.length || !!duplicatePackages.length;
}

interface DuplicatedPackage {
    name: string,
    instances: DuplicatedPackageInstance[],
}

interface DuplicatedPackageInstance {
    path: string,
    version?: string,
}

async function getDuplicateNodeModules(nodeModulePaths: Map<string, string[]>): Promise<DuplicatedPackage[]> {
    const duplicates: DuplicatedPackage[] = [];
    for (const [packageName, packagePaths] of nodeModulePaths.entries()) {
        if (packagePaths.length < 2) continue;
        const instances: DuplicatedPackageInstance[] = [];
        for (const packagePath of packagePaths) {
            instances.push({
                path: packagePath,
                version: await getPackageVersion(packagePath),
            });
        }
        duplicates.push({
            name: packageName,
            instances,
        });
    }

    return duplicates;
}

interface HotFrame {
    description: string;
    timeMs: number;
    path?: string;
    startLine?: number;
    startChar?: number;
    startOffset?: number;
    endLine?: number;
    endChar?: number;
    endOffset?: number;
    types?: HotType[];
    children: HotFrame[];
    emittedImports?: EmittedImport[];
}

interface HotType {
    type: object;
    children: HotType[];
}

async function getHotSpots(root: EventSpan, importExpressionThreshold: number, typesPath: string | undefined): Promise<HotFrame[]> {
    const relatedTypes = typesPath ? await getRelatedTypes(root, typesPath, /*leafOnly*/ false) : undefined;
    const positionMap = await getNormalizedPositions(root, relatedTypes);
    const types = typesPath ? await getTypes(typesPath) : undefined;
    return await getHotSpotsWorker(root, /*currentFile*/ undefined, positionMap, relatedTypes, importExpressionThreshold);
}

async function getHotSpotsWorker(curr: EventSpan, currentFile: string | undefined, positionMap: PositionMap, relatedTypes: Map<number, object> | undefined, importExpressionThreshold: number): Promise<HotFrame[]> {
    if (curr.event?.cat === "check") {
        const path = curr.event.args!.path;
        if (path) {
            currentFile = path;
        }
        else {
            assert(curr.event?.name !== "checkSourceFile", "checkSourceFile should have a path");
        }
    }

    const timeMs = Math.round((curr.end - curr.start) / 1000);
    const children: HotFrame[] = [];
    if (curr.children.length) {
        // Sort slow to fast
        const sortedChildren = curr.children.sort((a, b) => (b.end - b.start) - (a.end - a.start));
        for (const child of sortedChildren) {
            children.push(...await getHotSpotsWorker(child, currentFile, positionMap, relatedTypes, importExpressionThreshold));
        }
    }

    if (curr.event) {
        const hotFrame = await makeHotFrame();
        if (hotFrame) {
            return [hotFrame];
        }
    }

    return children;

    async function makeHotFrame(): Promise<HotFrame | undefined> {
        const event = curr.event!;
        switch (event.name) {
            // case "findSourceFile":
            //     TODO (https://github.com/microsoft/typescript-analyze-trace/issues/2)
            case "emitDeclarationFileOrBundle":
                const dtsPath = event.args.declarationFilePath;
                if (!dtsPath || !fs.existsSync(dtsPath)) {
                    return undefined;
                }
                try {
                    const emittedImports = await getEmittedImports(dtsPath, importExpressionThreshold);
                    if (emittedImports.length === 0) {
                        return undefined;
                    }
                    return {
                        description: `Emit declarations file`,
                        timeMs,
                        path: formatPath(dtsPath),
                        children,
                        emittedImports,
                    };
                }
                catch {
                    return undefined;
                }
            case "checkSourceFile":
                return {
                    description: `Check file ${formatPath(currentFile!)}`,
                    timeMs,
                    path: formatPath(currentFile!),
                    children,
                };
            case "structuredTypeRelatedTo":
                const args = event.args!;
                return {
                    description: `Compare types ${args.sourceId} and ${args.targetId}`,
                    timeMs,
                    children,
                    types: relatedTypes ? [ getHotType(args.sourceId), getHotType(args.targetId) ] : undefined,
                };
            case "getVariancesWorker":
                return {
                    description: `Determine variance of type ${event.args!.id}`,
                    timeMs,
                    children,
                    types: relatedTypes ? [ getHotType(event.args!.id) ] : undefined,
                };
            default:
                if (event.cat === "check" && event.args && event.args.pos && event.args.end) {
                    const frame: HotFrame = {
                        description: unmangleCamelCase(event.name),
                        timeMs,
                        path: formatPath(currentFile!),
                        children: undefined as any,
                    };
                    if (positionMap.has(currentFile!)) {
                        const updatedPos = positionMap.get(currentFile!)!.get(event.args.pos.toString())!;
                        const updatedEnd = positionMap.get(currentFile!)!.get(event.args.end.toString())!;
                        frame.startLine = updatedPos[0];
                        frame.startChar = updatedPos[1];
                        frame.endLine = updatedEnd[0];
                        frame.endChar = updatedEnd[1];
                    }
                    else {
                        frame.startOffset = event.args.pos;
                        frame.endOffset = event.args.end;
                    }
                    // Hack to print the children last for readability
                    delete (frame as any).children;
                    frame.children = children;
                    return frame;
                }
                return undefined;
        }
    }

    function getHotType(id: number): HotType {
        return worker(id, [])!;

        function worker(id: any, ancestorIds: any[]): HotType | undefined {
            if (typeof id !== "number") return;
            const type: any = relatedTypes!.get(id);
            if (!type) return undefined;

            if (type.location) {
                const path = type.location.path;
                if (positionMap.has(path)) {
                    const updatedPosition = positionMap.get(path)!.get(getLineCharMapKey(type.location.line, type.location.char));
                    if (updatedPosition) {
                        [ type.location.line, type.location.char ] = updatedPosition;
                    }
                    type.location.path = formatPath(path);
                }
            }

            const children: HotType[] = [];

            // If there's a cycle, suppress the children, but not the type itself
            if (ancestorIds.indexOf(id) < 0) {
                ancestorIds.push(id);

                for (const prop in type) {
                    if (prop.match(/type/i)) {
                        if (Array.isArray(type[prop])) {
                            for (const t of type[prop]) {
                                const child = worker(t, ancestorIds);
                                if (child) {
                                    children.push(child);
                                }
                            }
                        }
                        else {
                            const child = worker(type[prop], ancestorIds);
                            if (child) {
                                children.push(child);
                            }
                        }
                    }
                }

                ancestorIds.pop();
            }

            return { type, children };
        }
    }
}

function formatPath(p: string) {
    return path.normalize(p);
}

function undefinedIfEmpty<T>(arr: T[]): T[] | undefined {
    return arr.length ? arr : undefined;
}
