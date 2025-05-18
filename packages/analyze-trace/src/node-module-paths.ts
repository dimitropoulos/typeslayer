import type { TraceEvent, TraceJsonFile } from "@typeslayer/validate";
import type { NodeModulePaths } from "./utils";

const packageNameRegex = /\/node_modules\/((?:[^@][^/]+)|(?:@[^/]+\/[^/]+))/g;

export function getNodeModulePaths(traceFile: TraceJsonFile): NodeModulePaths {
	const nodeModulePaths: NodeModulePaths = new Map();
	traceFile.forEach((event: TraceEvent) => {
		if (event.name !== "findSourceFile") {
			return;
		}
		const path = event.args.fileName;
		if (path) {
			while (true) {
				const match = packageNameRegex.exec(path);
				if (!match) {
					break;
				}
				const packageName = match[1];
				
				const packagePath = match.input.substring(
					0,
					match.index + match[0].length,
				);

				if (nodeModulePaths.has(packageName)) {
					const paths = nodeModulePaths.get(packageName);
					if (paths && paths.indexOf(packagePath) < 0) {
						// Usually contains exactly one element
						paths.push(packagePath);
					}
				} else {
					nodeModulePaths.set(packageName, [packagePath]);
				}
			}
		}
	});

	return nodeModulePaths;
}
