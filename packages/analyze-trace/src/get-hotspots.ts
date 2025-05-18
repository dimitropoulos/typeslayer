import { normalize } from "node:path";
import {
	createTypeRegistry,
	type ResolvedType,
	type TypeId,
	type TypeRegistry,
	type TypesJsonFile,
} from "@typeslayer/validate";
import type { AnalyzeTraceOptions, EventSpan } from "./utils";

interface HotType {
	resolvedType: ResolvedType;
	children: HotType[];
}

interface HotFrame {
	children: HotFrame[];
	description: string;
	timeMs: number;

	path?: string;
	types?: HotType[];

	startLine?: number;
	startChar?: number;
	startOffset?: number;

	endLine?: number;
	endChar?: number;
	endOffset?: number;
}

export const getHotspots = async (
	hotPathsTree: EventSpan,
	typesFile: TypesJsonFile,
	options: AnalyzeTraceOptions,
): Promise<HotFrame[]> => {
	const typeRegistry = createTypeRegistry(typesFile);

	return await getHotspotsWorker({
		span: hotPathsTree,
		currentFile: undefined,
		typeRegistry,
		options,
	});
};

async function getHotspotsWorker({
	span,
	currentFile,
	typeRegistry,
	options,
}: {
	span: EventSpan;
	currentFile: string | undefined;
	typeRegistry: TypeRegistry;
	options: AnalyzeTraceOptions;
}): Promise<HotFrame[]> {
	if (span.event.cat === "check") {
		currentFile = span.event.args.path;
	}

	const children: HotFrame[] = [];
	if (span.children.length) {
		// Sort slow to fast
		const sortedChildren = span.children.sort(
			(a, b) => b.duration - a.duration,
		);
		for (const child of sortedChildren) {
			children.push(
				...(await getHotspotsWorker({
					span: child,
					currentFile,
					typeRegistry,
					options,
				})),
			);
		}
	}

	if (span.event.name !== "root") {
		const hotFrame = await makeHotFrame({
			span,
			children,
			typeRegistry,
		});
		if (hotFrame) {
			return [hotFrame];
		}
	}

	return children;
}

function getHotType({
	id,
	typeRegistry,
}: {
	id: number;
	typeRegistry: TypeRegistry;
}): HotType {
	function worker(id: TypeId, ancestorIds: TypeId[]): HotType {
		const resolvedType = typeRegistry.get(id);
		if (!resolvedType) {
			throw new Error(`Type ${id} not found`);
		}

		const children: HotType[] = [];

		// If there's a cycle, suppress the children, but not the type itself
		if (ancestorIds.indexOf(id) < 0) {
			ancestorIds.push(id);

			const properties = Object.keys(resolvedType) as (keyof ResolvedType)[];
			for (const property of properties) {
				switch (property) {
					case "typeArguments":
					case "unionTypes":
					case "intersectionTypes":
					case "aliasTypeArguments": {
						const typeIds = resolvedType[property];
						if (!Array.isArray(typeIds)) {
							throw new Error(`Expected array for ${property}`);
						}
						for (const typeId of typeIds) {
							const child = worker(typeId, ancestorIds);
							if (child) {
								children.push(child);
							}
						}
						continue;
					}

					case "instantiatedType":
					case "substitutionBaseType":
					case "constraintType":
					case "indexedAccessObjectType":
					case "indexedAccessIndexType":
					case "conditionalCheckType":
					case "conditionalExtendsType":
					case "conditionalTrueType":
					case "conditionalFalseType":
					case "keyofType":
					case "aliasType": {
						const typeId = resolvedType[property] as TypeId;
						const child = worker(typeId, ancestorIds);
						if (child) {
							children.push(child);
						}
						break;
					}

					case "id":
					case "flags":
					case "recursionId":
					case "intrinsicName":
					case "firstDeclaration":
					case "referenceLocation":
					case "isTuple":
					case "symbolName":
					case "display":
						break;

					default:
						property satisfies never;
						throw new Error(`Unexpected property ${property}`);
				}
			}
			ancestorIds.pop();
		}

		return {
			resolvedType,
			children,
		};
	}

	return worker(id, []);
}

async function makeHotFrame({
	span,
	children,
	typeRegistry,
}: {
	span: EventSpan;
	children: HotFrame[];
	typeRegistry: TypeRegistry;
}): Promise<HotFrame | undefined> {
	const { event, duration } = span;

	const timeMs = Math.round(duration / 1000);
	switch (event.name) {
		// case "findSourceFile":
		//     TODO (https://github.com/microsoft/typescript-analyze-trace/issues/2)

		case "checkSourceFile": {
			const filePath = event.args.path;
			return {
				description: `Check file ${normalize(filePath)}`,
				timeMs,
				path: normalize(filePath),
				children,
			};
		}

		case "structuredTypeRelatedTo":
			return {
				description: `Compare types ${event.args.sourceId} and ${event.args.targetId}`,
				timeMs,
				children,
				types: [
					getHotType({
						id: event.args.sourceId,
						typeRegistry,
					}),
					getHotType({
						id: event.args.targetId,
						typeRegistry,
					}),
				],
			};

		case "getVariancesWorker":
			return {
				description: `Determine variance of type ${event.args.id}`,
				timeMs,
				children,
				types: [getHotType({ id: event.args.id, typeRegistry })],
			};

		case "checkExpression":
		case "checkVariableDeclaration": {
			const filePath = event.args.path;
			const frame: HotFrame = {
				description: event.name,
				timeMs,
				path: normalize(filePath),
				children: [],
			};
			return frame;
		}

		default:
			return undefined;
	}
}
