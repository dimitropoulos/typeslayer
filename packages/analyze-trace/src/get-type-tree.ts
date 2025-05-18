// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import simplify = require("./simplify-type");

function getTypeTree(id: number, simplifiedTypes: Map<number, object>, types?: readonly object[]): object {
    const tree = {};
    addTypeToTree(tree, id, []);
    return tree;

    function addTypeToTree(tree: {}, id: any, ancestorIds: any[]): void {
        if (typeof id !== "number") return;
        let type = simplifiedTypes.get(id);
        if (!type) {
            type = types && simplify(types[id - 1]);
            if (!type) return;
            simplifiedTypes.set(id, type);
        }

        const children = {};

        // If there's a cycle, suppress the children, but not the type itself
        if (ancestorIds.indexOf(id) < 0) {
            ancestorIds.push(id);

            for (const prop in type) {
                if (prop.match(/type/i)) {
                    if (Array.isArray(type[prop])) {
                        for (const t of type[prop]) {
                            addTypeToTree(children, t, ancestorIds);
                        }
                    }
                    else {
                        addTypeToTree(children, type[prop], ancestorIds);
                    }
                }
            }

            ancestorIds.pop();
        }

        tree[JSON.stringify(type)] = children;
    }
}

export = getTypeTree;