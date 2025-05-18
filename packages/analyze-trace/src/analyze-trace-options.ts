// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export const commandLineOptions = {
    "forceMillis": {
        alias: ["forcemillis", "force-millis"],
        describe: "Events of at least this duration (in milliseconds) will reported unconditionally",
        type: "number",
        default: 500,
    },
    "skipMillis": {
        alias: ["skipmillis", "skip-millis"],
        describe: "Events of less than this duration (in milliseconds) will suppressed unconditionally",
        type: "number",
        default: 100,
    },
    "expandTypes": {
        alias: ["expandtypes", "expand-types"],
        describe: "Expand types when printing",
        type: "boolean",
        default: true,
    },
    "color": {
        describe: "Color the output to make it easier to read",
        type: "boolean",
        default: true,
    },
    "json": {
        describe: "Produce JSON output for programmatic consumption (EXPERIMENTAL)",
        type: "boolean",
        default: false,
    },
} as const;

// Replicating the type inference in yargs would be excessive
type Argv = {
    forceMillis: number,
    skipMillis: number,
    expandTypes: boolean,
    color: boolean,
    json: boolean,
};

export function checkCommandLineOptions(argv: Argv): true {
    if (argv.forceMillis < argv.skipMillis) {
        throw new Error("forceMillis cannot be less than skipMillis")
    }
    return true;
}

export function pushCommandLineOptions(array: string[], argv: Argv): void {
    array.push(
        "--force-millis", `${argv.forceMillis}`,
        "--skip-millis", `${argv.skipMillis}`,
        argv.expandTypes ? "--expand-types" : "--no-expand-types",
        argv.color ? "--color" : "--no-color",
        argv.json ? "--json" : "--no-json",
    );
}
