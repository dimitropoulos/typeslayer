import {
  FiberManualRecord,
  KeyboardArrowDown,
  KeyboardArrowRight,
} from "@mui/icons-material";
import { Box, Stack, Typography } from "@mui/material";
import type { ResolvedType } from "@typeslayer/validate";
import { type FC, useState } from "react";
import { useTypeRegistry } from "../pages/award-winners/use-type-registry";
import { theme } from "../theme";
import { CenterLoader } from "./center-loader";
import { OpenablePath, propertyTextStyle } from "./openable-path";
import { ShowMoreChildren } from "./show-more-children";
import { TypeSummary } from "./type-summary";

// Type guard for Location objects coming from backend serialization
function isLocation(v: unknown): v is {
  path: string;
  start: { line: number; character: number };
  end?: { line: number; character: number };
} {
  if (!v || typeof v !== "object") {
    return false;
  }
  const loc = v as Record<string, unknown>;
  if (typeof loc.path !== "string") {
    return false;
  }
  const start = loc.start as Record<string, unknown> | undefined;
  if (!start || typeof start !== "object") {
    return false;
  }
  return typeof start.line === "number" && typeof start.character === "number";
}

export const DisplayRecursiveType: FC<{
  id: number;
  depth?: number;
}> = ({ id, depth = 0 }) => {
  const [expanded, setExpanded] = useState(true);
  const { typeRegistry, isLoading } = useTypeRegistry();

  if (isLoading) {
    return <CenterLoader />;
  }

  if (!typeRegistry) {
    return <Box>[Missing Data for TypeId]: {id}</Box>;
  }

  if (Number.isNaN(id)) {
    return null;
  }

  if (depth > 10) {
    return (
      <Box style={{ marginLeft: depth * 16 }}>
        [TypeSlayer Recursion limit reached for type {id}]
      </Box>
    );
  }

  if (id === 0) {
    return <Box style={{ marginLeft: depth * 16 }}>[TypeId Not Provided]</Box>;
  }

  const resolvedType = typeRegistry[id];

  const marginLeft = depth * 16;

  if (!resolvedType) {
    return <Box style={{ marginLeft }}>[Missing Node: {id}]</Box>;
  }

  const { flags = [] } = resolvedType;

  const toggleExpanded = () => setExpanded(expanded => !expanded);

  const children = (
    Object.entries(resolvedType) as [
      keyof ResolvedType,
      ResolvedType[keyof ResolvedType],
    ][]
  )
    .map(([key, value], index) => {
      const reactKey = `${id}:${String(key)}:${index}`;

      switch (key) {
        //
        //  Skip these
        //
        case "id":
        case "flags":
        case "recursionId":
        case "symbolName":
        case "intrinsicName":
          return null;

        //
        //  display
        //
        case "display": {
          if (typeof value !== "string") {
            throw new Error(
              `Expected display to be a string, got ${typeof value}`,
            );
          }

          // skipping these because we use this for the name
          const skipThese = [
            "BooleanLiteral",
            "StringLiteral",
            "BigIntLiteral",
            "NumberLiteral",
          ] as const;
          if (skipThese.some(flag => flags.includes(flag))) {
            return null;
          }

          return (
            <Box
              sx={{
                background: theme.palette.grey[900],
                borderRadius: 1,
                px: 1,
                py: 0.5,
                border: `1px solid ${theme.palette.divider}`,
                alignSelf: "flex-start",
              }}
              key={reactKey}
            >
              <code>
                {typeof value === "string"
                  ? value.split("\\").join("")
                  : String(value)}
              </code>
            </Box>
          );
        }

        //
        //  Locations
        //
        case "firstDeclaration":
        case "destructuringPattern":
        case "referenceLocation": {
          if (isLocation(value)) {
            return (
              <OpenablePath
                key={reactKey}
                title={`${key}:`}
                absolutePath={value.path}
                line={value.start.line}
                character={value.start.character}
              />
            );
          }
          return null;
        }

        //
        //  TypeId
        //
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
        case "evolvingArrayElementType":
        case "evolvingArrayFinalType":
        case "reverseMappedSourceType":
        case "reverseMappedMappedType":
        case "reverseMappedConstraintType":
        case "aliasType":
          if (value === id) {
            return null;
          }

          if (typeof value === "number") {
            return (
              <Stack key={reactKey}>
                <Typography sx={propertyTextStyle}>{String(key)}:</Typography>
                <DisplayRecursiveType id={value} depth={depth + 2} />
              </Stack>
            );
          }
          throw new Error(
            `Expected instantiatedType to be a number, got ${typeof value}`,
          );

        //
        //  TypeId[]
        //
        case "aliasTypeArguments":
        case "intersectionTypes":
        case "typeArguments":
        case "unionTypes": {
          if (!Array.isArray(value)) {
            throw new Error(
              `Expected unionTypes to be an array, got ${typeof value}`,
            );
          }
          if (!value.every(v => typeof v === "number")) {
            throw new Error(
              `Expected all values in unionTypes to be numbers, got ${value
                .map(v => typeof v)
                .join(", ")}`,
            );
          }
          if (value.length === 0) {
            return (
              <Stack
                key={reactKey}
                direction="row"
                gap={1}
                fontFamily="monospace"
              >
                {key}: <em>none</em>
              </Stack>
            );
          }

          return (
            <Stack key={reactKey}>
              <Stack display="inline">
                <Typography display="inline" sx={propertyTextStyle}>
                  {String(key)}:{" "}
                </Typography>
                <Typography display="inline" color="textDisabled">
                  {value.length.toLocaleString()}
                </Typography>
              </Stack>
              <Stack gap={1} key={reactKey} sx={{ py: 1 }}>
                <ShowMoreChildren incrementsOf={50}>
                  {value.map((v, i) => (
                    <DisplayRecursiveType
                      key={`${reactKey}:${
                        // biome-ignore lint/suspicious/noArrayIndexKey: the sort order is stable and we don't have any other information to use since you can do `string | string | string`, for example.
                        i
                      }`}
                      id={v as number}
                      depth={depth + 2}
                    />
                  ))}
                </ShowMoreChildren>
              </Stack>
            </Stack>
          );
        }

        // really not sure what the best way to handle this and why it's not a flag like everything else
        case "isTuple":
          return null;

        default:
          key satisfies never;
          throw new Error(`Unexpected property ${String(key)} in type ${id}`);
      }
    })
    .filter(x => x !== null);

  const noChildren = children.length === 0;

  const TwiddlyGuy = noChildren
    ? FiberManualRecord
    : expanded
      ? KeyboardArrowDown
      : KeyboardArrowRight;

  return (
    <Stack gap={0.5} direction="row">
      <TwiddlyGuy
        onClick={noChildren ? undefined : toggleExpanded}
        sx={
          noChildren
            ? {
                cursor: "default",
                transform: "scale(0.5)",
                alignSelf: "center",
                color: theme.palette.text.secondary,
                pt: "4px",
              }
            : {
                cursor: "pointer",
                pt: "4px",
              }
        }
      />
      <Stack>
        <TypeSummary showFlags resolvedType={resolvedType} />
        {expanded && !noChildren && (
          <Stack gap={1} sx={{ marginTop: 0.5 }}>
            {children}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
};
