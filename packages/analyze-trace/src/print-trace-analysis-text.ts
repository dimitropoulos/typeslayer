// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { assert } from "console";
import chalk = require("chalk");
import treeify = require("treeify");
import fs = require("fs");
import path = require("path");

import getTypeTree = require("./get-type-tree");
import { EventSpan, parse } from "./parse-trace-file";
import { buildHotPathsTree, getEmittedImports, getLineCharMapKey, getNormalizedPositions, getPackageVersion, getRelatedTypes, getTypes, PositionMap, unmangleCamelCase } from "./analyze-trace-utilities";

export async function reportHighlights(
    tracePath: string,
    typesPath: string | undefined,
    thresholdDuration: number,
    minDuration: number,
    minPercentage: number,
    importExpressionThreshold: number): Promise<boolean> {

    const parseResult = await parse(tracePath, minDuration);

    const root = buildHotPathsTree(parseResult, thresholdDuration, minPercentage);

    const unclosedStack = parseResult.unclosedStack;
    if (unclosedStack.length) {
        console.log("Trace ended unexpectedly");

        while (unclosedStack.length) {
            const event = unclosedStack.pop()!;
            console.log(`> ${event.name}: ${JSON.stringify(event.args)}`);
        }

        console.log();
    }

    const sawHotspots = await printHotStacks(root, importExpressionThreshold, typesPath);
    console.log();
    const sawDuplicates = await printDuplicateNodeModules(parseResult.nodeModulePaths);

    return sawHotspots || sawDuplicates;
}

async function printDuplicateNodeModules(nodeModulePaths: Map<string, string[]>): Promise<boolean> {
    const tree = {};
    let sawDuplicate = false;
    const sorted = Array.from(nodeModulePaths.entries()).sort(([n1,p1], [n2,p2]) => p2.length - p1.length || n1.localeCompare(n2));
    for (const [packageName, packagePaths] of sorted) {
        if (packagePaths.length < 2) continue;
        sawDuplicate = true;
        const packageTree = {};
        for (const packagePath of packagePaths.sort((p1, p2) => p1.localeCompare(p2))) {
            const version = await getPackageVersion(packagePath);
            packageTree[`${version ? `Version ${version}` : `Unknown version`} from ${packagePath}`] = {};
        }
        tree[packageName] = packageTree;
    }

    if (sawDuplicate) {
        console.log("Duplicate packages");
        console.log(treeify.asTree(tree, /*showValues*/ false, /*hideFunctions*/ true).trimEnd());
    }
    else {
        console.log("No duplicate packages found");
    }

    return sawDuplicate;
}

async function printHotStacks(root: EventSpan, importExpressionThreshold: number, typesPath: string | undefined): Promise<boolean> {
    const relatedTypes = typesPath ? await getRelatedTypes(root, typesPath, /*leafOnly*/ true) : undefined;

    const positionMap = await getNormalizedPositions(root, relatedTypes);
    const tree = await makePrintableTree(root, /*currentFile*/ undefined, positionMap, relatedTypes, importExpressionThreshold);

    const sawHotspots = Object.entries(tree).length > 0;
    if (sawHotspots) {
        console.log("Hot Spots");
        console.log(treeify.asTree(tree, /*showValues*/ false, /*hideFunctions*/ true).trimEnd());
    }
    else {
        console.log("No hot spots found");
    }
    return sawHotspots;
}

async function makePrintableTree(curr: EventSpan, currentFile: string | undefined, positionMap: PositionMap, relatedTypes: Map<number, object> | undefined, importExpressionThreshold: number): Promise<{}> {
    let childTree = {};

    let showCurrentFile = false;
    if (curr.event?.cat === "check") {
        const path = curr.event.args!.path;
        if (path) {
            showCurrentFile = path !== currentFile;
            currentFile = path;
        }
        else {
            assert(curr.event?.name !== "checkSourceFile", "checkSourceFile should have a path");
        }
    }

    if (curr.children.length) {
        // Sort slow to fast
        const sortedChildren = curr.children.sort((a, b) => (b.end - b.start) - (a.end - a.start));
        for (const child of sortedChildren) {
            Object.assign(childTree, await makePrintableTree(child, currentFile, positionMap, relatedTypes, importExpressionThreshold));
        }
    }

    if (curr.event) {
        const eventStr = await eventToString();
        if (eventStr) {
            let result = {};
            result[`${eventStr} (${Math.round((curr.end - curr.start) / 1000)}ms)`] = childTree;
            return result;
        }
    }

    return childTree;

    async function eventToString(): Promise<string | undefined> {
        const event = curr.event!;
        switch (event.name) {
            // TODO (https://github.com/microsoft/typescript-analyze-trace/issues/2)
            // case "findSourceFile":
            //     return `Load file ${event.args!.fileName}`;
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
                    for (const { name, count } of emittedImports) {
                        // Directly modifying childTree is pretty hacky
                        childTree[`Consider adding \`${chalk.cyan(`import ${chalk.cyan(name)}`)}\` which is used in ${count} places`] = {};
                    }
                    return `Emit declarations file ${formatPath(dtsPath)}`;
                }
                catch {
                    return undefined;
                }
            case "checkSourceFile":
                return `Check file ${formatPath(currentFile!)}`;
            case "structuredTypeRelatedTo":
                const args = event.args!;
                if (relatedTypes && curr.children.length === 0) {
                    const typeTree = {
                        ...getTypeTree(args.sourceId, relatedTypes),
                        ...getTypeTree(args.targetId, relatedTypes),
                    };
                    // Directly modifying childTree is pretty hacky
                    Object.assign(childTree, updateTypeTreePositions(typeTree));
                }
                return `Compare types ${args.sourceId} and ${args.targetId}`;
            case "getVariancesWorker":
                if (relatedTypes && curr.children.length === 0) {
                    const typeTree = getTypeTree(event.args!.id, relatedTypes);
                    // Directly modifying childTree is pretty hacky
                    Object.assign(childTree, updateTypeTreePositions(typeTree));
                }
                return `Determine variance of type ${event.args!.id}`;
            default:
                if (event.cat === "check" && event.args && event.args.pos && event.args.end) {
                    const currentFileClause = showCurrentFile
                        ? ` in ${formatPath(currentFile!)}`
                        : "";
                    if (positionMap.has(currentFile!)) {
                        const updatedPos = positionMap.get(currentFile!)!.get(event.args.pos.toString())!;
                        const updatedEnd = positionMap.get(currentFile!)!.get(event.args.end.toString())!;
                        return `${unmangleCamelCase(event.name)}${currentFileClause} from (line ${updatedPos[0]}, char ${updatedPos[1]}) to (line ${updatedEnd[0]}, char ${updatedEnd[1]})`;
                    }
                    else {
                        return `${unmangleCamelCase(event.name)}${currentFileClause} from offset ${event.args.pos} to offset ${event.args.end}`;
                    }
                }
                return undefined;
        }
    }

    function updateTypeTreePositions(typeTree: any): any {
        let newTree = {};
        for (let typeString in typeTree) {
            const subtree = typeTree[typeString];

            const type = JSON.parse(typeString);
            if (type.location) {
                const path = type.location.path;
                if (positionMap.has(path)) {
                    const updatedPosition = positionMap.get(path)!.get(getLineCharMapKey(type.location.line, type.location.char))!;
                    [ type.location.line, type.location.char ] = updatedPosition;

                    typeString = JSON.stringify(type);
                }

                typeString = typeString.replace(path, formatPath(path));
            }

            newTree[typeString] = updateTypeTreePositions(subtree);
        }

        return newTree;
    }
}

function formatPath(p: string) {
    if (/node_modules/.test(p)) {
        p = p.replace(/\/node_modules\/([^@][^/]+)\//g, `/node_modules/${chalk.cyan("$1")}/`);
        p = p.replace(/\/node_modules\/(@[^/]+\/[^/]+)/g, `/node_modules/${chalk.cyan("$1")}/`);
    }
    else {
        p = path.join(path.dirname(p), chalk.cyan(path.basename(p)));
    }
    return chalk.magenta(path.normalize(p));
}