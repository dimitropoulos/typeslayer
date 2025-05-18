// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import cp = require("child_process");
import fs = require("fs");
import os = require("os");
import path = require("path");

import exit = require("exit");
import plimit = require("p-limit");
import yargs = require("yargs");

import { commandLineOptions, checkCommandLineOptions, pushCommandLineOptions } from "./analyze-trace-options";

const argv = yargs(process.argv.slice(2))
    .command("$0 <traceDir>", "Preprocess tracing type dumps", yargs => yargs
        .positional("traceDir", { type: "string", desc: "Directory of trace and types files", coerce: throwIfNotDirectory })
        .options(commandLineOptions)
        .check(checkCommandLineOptions)
        .help("h").alias("h", "help")
        .epilog("Exits with code 0 if highlights were found, 1 if no highlights were found, and 2 if an error occurred")
        .strict())
    .argv;

// Try to leave one core free
const limit = plimit(Math.max(1, os.cpus().length - 1));

const traceDir = argv.traceDir!;

main()
    .then(code => exit(code))
    .catch(err => {
        console.error(`Internal Error: ${err.message}`)
        exit(2);
    });

interface Project {
    configFilePath?: string;
    tracePath: string;
    typesPath: string;
}

interface ProjectResult {
    project: Project;
    stdout: string;
    stderr: string;
    exitCode: number | undefined;
    signal: NodeJS.Signals | undefined;
}

async function main(): Promise<number> {
    let projects: undefined | Project[];

    const legendPath = path.join(traceDir, "legend.json");
    if (await isFile(legendPath)) {
        try {
            const legendText = await fs.promises.readFile(legendPath, { encoding: "utf-8" });
            projects = JSON.parse(legendText);

            for (const project of projects!) {
                project.tracePath = path.resolve(traceDir, path.basename(project.tracePath));
                project.typesPath = path.resolve(traceDir, path.basename(project.typesPath));
            }
        }
        catch (e: any) {
            console.error(`Error reading legend file: ${e.message}`);
        }
    }

    if (!projects) {
        projects = [];

        for (const entry of await fs.promises.readdir(traceDir, { withFileTypes: true })) {
            if (!entry.isFile()) continue;

            const name = entry.name;
            const match = name.match(/^trace(.*\.json)$/);
            if (match) {
                projects.push({
                    tracePath: path.join(traceDir, name),
                    typesPath: path.join(traceDir, `types${match[1]}`),
                });
            }
        }
    }

    const results = await Promise.all(projects.map(p => limit(analyzeProject, p)));
    return argv.json
        ? await printResultsAsJson(results)
        : await printResultsAsText(results);
}

async function printResultsAsJson(results: readonly ProjectResult[]): Promise<number> {
    let sawHighlights = false;
    const hadErrors: ProjectResult[] = [];
    const hadNoErrors: (ProjectResult & { highlights: object })[] = [];
    for (const result of results) {
        if (result.stderr || result.signal) {
            hadErrors.push(result);
            continue;
        }

        if (result.exitCode) {
            // 1 just indicates "no highlights"
            if (result.exitCode !== 1) {
                hadErrors.push(result);
            }
            continue;
        }

        try {
            hadNoErrors.push({ ...result, highlights: JSON.parse(result.stdout) });
            sawHighlights = true;
        }
        catch {
            hadErrors.push({ ...result, stderr: "Failed to parse project result JSON" });
        }
    }

    const json = {
        errors: hadErrors.length === 0
            ? undefined
            : hadErrors.map(result => ({
                ...result,
                stdout: undefined,
                stderr: undefined,
                exitCode: result.exitCode || undefined,
                message: result.stderr,
            })),
        results: hadNoErrors.map(result => ({
            project: result.project,
            highlights: result.highlights,
        })),
    };

    console.log(JSON.stringify(json, undefined, 2));

    return hadErrors.length > 0
        ? 2
        : sawHighlights
            ? 0
            : 1;
}

async function printResultsAsText(results: readonly ProjectResult[]): Promise<number> {
    const hadHighlights: (ProjectResult & { score: number })[] = [];
    const hadErrors: ProjectResult[] = [];
    for (const result of results) {
        if (result.stderr || result.signal) {
            hadErrors.push(result);
            continue;
        }

        if (result.exitCode) {
            // 1 just indicates "no highlights"
            if (result.exitCode !== 1) {
                hadErrors.push(result);
            }
            continue;
        }

        // First will be the largest, so only need to match one
        const match = result.stdout.match(/\((\d+)[ ]*ms\)/);
        const score = match ? +match[1] : 0; // Treat all duplicates as tied for now
        hadHighlights.push({...result, score });
    }

    let first = true;
    const projectCount = results.length;

    // Break ties with trace paths for determinism
    hadHighlights.sort((a, b) => b.score - a.score || a.project.tracePath.localeCompare(b.project.tracePath) ); // Descending
    for (const result of hadHighlights) {
        if (!first) console.log();
        first = false;

        const project = result.project;
        if (projectCount > 1 || project.configFilePath) {
            console.log(`Analyzed ${getProjectDescription(project)}`);
        }
        console.log(result.stdout);
    }

    for (const errorResult of hadErrors) {
        if (!first) console.log();
        first = false;

        const project = errorResult.project;
        console.log(`Error analyzing ${getProjectDescription(project)}`);
        if (errorResult.stderr) {
            console.log(errorResult.stderr);
        }
        else if (errorResult.exitCode) {
            console.log(`Exited with code ${errorResult.exitCode}`);
        }
        else if (errorResult.signal) {
            console.log(`Terminated with signal ${errorResult.signal}`);
        }
    }

    const interestingCount = hadHighlights.length + hadErrors.length;
    if (interestingCount < projectCount) {
        if (!first) console.log();
        first = false;

        console.log(`Found nothing in ${projectCount - interestingCount}${interestingCount ? " other" : ""} project(s)`);
    }

    return hadErrors.length > 0
        ? 2
        : hadHighlights.length > 0
            ? 0
            : 1;
}

function getProjectDescription(project: Project) {
    return project.configFilePath
       ? `${project.configFilePath} (${path.basename(project.tracePath)})`
       : path.basename(project.tracePath);
}

async function analyzeProject(project: Project): Promise<ProjectResult> {
    const args = [ project.tracePath ];
    if (await isFile(project.typesPath)) {
        args.push(project.typesPath);
    }
    pushCommandLineOptions(args, argv);

    return new Promise<ProjectResult>(resolve => {
        const child = cp.fork(path.join(__dirname, "analyze-trace-file"), args, { stdio: "pipe" });

        let stdout = "";
        let stderr = "";

        child.stdout!.on("data", chunk => stdout += chunk);
        child.stderr!.on("data", chunk => stderr += chunk);

        child.on("exit", (code, signal) => {
            resolve({
                project,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                exitCode: code ?? undefined,
                signal: signal ?? undefined,
            });
        });
    });
}

function isFile(path: string): Promise<boolean> {
    return fs.promises.stat(path).then(stats => stats.isFile()).catch(_ => false);
}

function throwIfNotDirectory(path: string): string {
    if (!fs.existsSync(path) || !fs.statSync(path)?.isDirectory()) {
        throw new Error(`${path} is not a directory`);
    }
    return path;
}