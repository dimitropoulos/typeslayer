import { normalize } from "node:path";
import {
  createTypeRegistry,
  type ResolvedType,
  type TypeId,
  type TypeRegistry,
  type TypesJsonSchema,
} from "@typeslayer/validate";
import type { AnalyzeTraceOptions, EventSpan, HotSpot, HotType } from "./utils";

export const getHotspots = async (
  hotPathsTree: EventSpan,
  typesFile: TypesJsonSchema,
  options: AnalyzeTraceOptions,
): Promise<HotSpot[]> =>
  getHotspotsWorker({
    span: hotPathsTree,
    currentFile: undefined,
    typeRegistry: createTypeRegistry(typesFile),
    options,
  });

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
}): Promise<HotSpot[]> {
  if (span.event.cat === "check") {
    currentFile = span.event.args.path;
  }

  const children: HotSpot[] = [];
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

const notFound = {
  children: [],
  resolvedType: {
    id: -1,
    display: "[Type Not Found]",
    flags: [],
  },
} satisfies HotType;

function getHotType({
  id,
  typeRegistry,
}: {
  id: number;
  typeRegistry: TypeRegistry;
}): HotType {
  function worker(id: TypeId, ancestorIds: TypeId[]): HotType {
    if (id === -1) {
      return notFound;
    }

    const resolvedType = typeRegistry[id];

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
          case "aliasTypeArguments":
          case "intersectionTypes":
          case "typeArguments":
          case "unionTypes": {
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

          case "aliasType":
          case "conditionalCheckType":
          case "conditionalExtendsType":
          case "conditionalFalseType":
          case "conditionalTrueType":
          case "constraintType":
          case "evolvingArrayElementType":
          case "evolvingArrayFinalType":
          case "indexedAccessIndexType":
          case "indexedAccessObjectType":
          case "instantiatedType":
          case "keyofType":
          case "reverseMappedConstraintType":
          case "reverseMappedMappedType":
          case "reverseMappedSourceType":
          case "substitutionBaseType": {
            const typeId = resolvedType[property] as TypeId;
            const child = worker(typeId, ancestorIds);
            if (child) {
              children.push(child);
            }
            break;
          }

          case "destructuringPattern":
          case "display":
          case "firstDeclaration":
          case "flags":
          case "id":
          case "intrinsicName":
          case "isTuple":
          case "recursionId":
          case "referenceLocation":
          case "symbolName":
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
  children: HotSpot[];
  typeRegistry: TypeRegistry;
}): Promise<HotSpot | undefined> {
  const { event, duration, start, end } = span;

  switch (event.name) {
    // case "findSourceFile":
    //     (https://github.com/microsoft/typescript-analyze-trace/issues/2)

    case "checkSourceFile": {
      const filePath = event.args.path;
      const normalizedPath = normalize(filePath);
      return {
        description: `Check file ${normalizedPath}`,
        start,
        end,
        duration,
        path: normalizedPath,

        children,
      };
    }

    case "structuredTypeRelatedTo":
      return {
        description: `Compare types ${event.args.sourceId} and ${event.args.targetId}`,
        start,
        end,
        duration,
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
        start,
        end,
        duration,
        children,
        types: [getHotType({ id: event.args.id, typeRegistry })],
      };

    case "checkExpression":
    case "checkVariableDeclaration": {
      const filePath = event.args.path;
      const path = filePath ? { path: normalize(filePath) } : {};
      const frame: HotSpot = {
        description: event.name,
        start,
        end,
        duration,
        ...path,
        children: [],
      };
      return frame;
    }

    default:
      return undefined;
  }
}
