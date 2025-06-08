import {
	packageNameRegex,
	type TraceEvent,
	type TraceJsonSchema,
} from "@typeslayer/validate";
import type { NodeModulePaths } from "./utils";

export function getNodeModulePaths(
	traceJson: TraceJsonSchema,
): NodeModulePaths {
	const nodeModulePaths: NodeModulePaths = {};
	traceJson.forEach((event: TraceEvent) => {
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

				if (packageName in nodeModulePaths) {
					const paths = nodeModulePaths[packageName];
					if (paths && paths.indexOf(packagePath) < 0) {
						// Usually contains exactly one element
						paths.push(packagePath);
					}
				} else {
					nodeModulePaths[packageName] = [packagePath];
				}
			}
		}
	});

	return nodeModulePaths;
}
