// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

if (process.argv.length < 4) {
    const path = require("path");
    console.error(`Usage: ${path.basename(process.argv[0])} ${path.basename(process.argv[1])} type_path id+`);
    process.exit(1);
}

import fs = require("fs");
import treeify = require("treeify");
import getTypeTree = require("./get-type-tree");


const typesPath = process.argv[2];
const ids = process.argv.slice(3).map(x => +x);

const json = fs.readFileSync(typesPath, { encoding: "utf-8" });
const types: any[] = JSON.parse(json);

console.log(ids.map(id => printType(id)).join("\n"));

function printType(id: number): string {
    const cache = new Map<number, object>();
    const tree = getTypeTree(id, cache, types) as {};
    return treeify.asTree(tree, /*showValues*/ false, /*hideFunctions*/ true);
}
