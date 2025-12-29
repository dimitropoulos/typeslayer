import DoubleArrow from "@mui/icons-material/DoubleArrow";
import FiberManualRecord from "@mui/icons-material/FiberManualRecord";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import { Alert, AlertTitle, Box, Stack, Typography } from "@mui/material";
import type { ResolvedType, TypeId } from "@typeslayer/validate";
import { type FC, type ReactNode, useState } from "react";
import { useGetRecursiveResolvedTypes } from "../hooks/tauri-hooks";
import { theme } from "../theme";
import { InlineCode } from "./inline-code";
import { OpenablePath, propertyTextStyle } from "./openable-path";
import { ShowMoreChildren } from "./show-more-children";
import {
  getHumanReadableName,
  TypeSummary,
  TypeSummarySkeleton,
} from "./type-summary";

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

const baseTwiddleSx = {
  alignSelf: "flex-start",
  pt: "3px",
  height: "100%",
};

const noChildrenDot = (
  <FiberManualRecord
    sx={{
      ...baseTwiddleSx,
      cursor: "default",
      transform: "scale(0.5)",
      color: theme.palette.text.secondary,
    }}
  />
);

const wrapperSx = {
  gap: 0.5,
  flexDirection: "row",
  alignItems: "center",
  borderLeft: 1,
  borderColor: "transparent",
  "&:hover": {
    borderColor: "#ffffff30",
  },
};

export const DisplayRecursiveType: FC<{
  id: TypeId;
  depth?: number; // for recursion
  visitors?: TypeId[]; // for recursion
}> = ({ id, depth = 0, visitors = [] }) => {
  const [expanded, setExpanded] = useState(true);
  const { data: partialIndexedTypeRegistry, isLoading } =
    useGetRecursiveResolvedTypes(id);

  const resolvedType = partialIndexedTypeRegistry?.[id];

  if (isLoading) {
    return (
      <Stack sx={wrapperSx}>
        {noChildrenDot}
        <TypeSummarySkeleton showFlags />
      </Stack>
    );
  }

  if (Number.isNaN(id)) {
    return null;
  }

  if (id === 0) {
    return <Box style={{ marginLeft: depth * 16 }}>[TypeId Not Provided]</Box>;
  }

  const marginLeft = depth * 16;
  if (!resolvedType) {
    return <Box style={{ marginLeft }}>[Missing Node: {id}]</Box>;
  }

  if (depth > 10) {
    return (
      <Stack sx={wrapperSx}>
        {noChildrenDot}
        <Stack>
          <TypeSummary
            typeId={id}
            flags={resolvedType.flags}
            name={getHumanReadableName(resolvedType)}
            showFlags
          />
          <Alert severity="error" style={{}}>
            <AlertTitle>Type Depth Exceeded</AlertTitle>
            you went pretty deep. we're stopping here. if you wanna keep going
            then search for type <InlineCode>{id}</InlineCode>
          </Alert>
        </Stack>
      </Stack>
    );
  }

  if (visitors.includes(id)) {
    return (
      <Stack sx={wrapperSx}>
        {noChildrenDot}
        <Stack>
          <TypeSummary
            typeId={id}
            flags={resolvedType.flags}
            name={getHumanReadableName(resolvedType)}
            showFlags
          />
          <Alert severity="info" style={{}}>
            <AlertTitle>Recursive Type</AlertTitle>
            <Stack gap={0.5}>
              <Typography>
                type <InlineCode>{id}</InlineCode> contains a recursion, so
                we're stopping here to avoid an infinite loop. there's not
                necessarily anything wrong with a recursive type: actually,
                TypeScript intentionally allows it and sometimes it's useful.
                yet, other times, it happens by accident and is the source of a
                problem.
              </Typography>
              <Typography>
                here's the loop:{" "}
                {[...visitors, id]
                  .map(visitor => (
                    <InlineCode
                      style={
                        id === visitor ? { textDecoration: "underline" } : {}
                      }
                      key={visitor}
                    >
                      {visitor}
                    </InlineCode>
                  ))
                  .reduce(
                    (acc, visitor, index) => [
                      ...[
                        index === 0
                          ? []
                          : [
                              acc,
                              <DoubleArrow
                                fontSize="small"
                                // biome-ignore lint/suspicious/noArrayIndexKey: the sort order is stable
                                key={index}
                                sx={{
                                  width: 27,
                                  px: 1,
                                  flexShrink: 0,
                                  height: "100%",
                                  alignSelf: "center",
                                }}
                              />,
                            ],
                      ],
                      visitor,
                    ],
                    [] as ReactNode[],
                  )}
              </Typography>
              <Typography>
                with this information, look at each of these types
                slowly/carefully and make sure the loop is intended.
              </Typography>
            </Stack>
          </Alert>
        </Stack>
      </Stack>
    );
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
              <Stack key={reactKey} gap={1}>
                <Typography sx={propertyTextStyle}>{String(key)}:</Typography>
                <DisplayRecursiveType
                  id={value}
                  depth={depth + 1}
                  visitors={[...visitors, id]}
                />
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
            <Stack key={reactKey} gap={0}>
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
                      depth={depth + 1}
                      visitors={[...visitors, id]}
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

  const ExpandIcon = expanded ? KeyboardArrowDown : KeyboardArrowRight;

  const twiddle = noChildren ? (
    noChildrenDot
  ) : (
    <ExpandIcon
      onClick={noChildren ? undefined : toggleExpanded}
      sx={{
        ...baseTwiddleSx,
        cursor: "pointer",
      }}
    />
  );

  return (
    <Stack sx={wrapperSx}>
      {twiddle}
      <Stack>
        <TypeSummary
          showFlags
          typeId={resolvedType.id}
          flags={resolvedType.flags}
          name={getHumanReadableName(resolvedType)}
        />
        {expanded && !noChildren && (
          <Stack gap={1} sx={{ marginTop: 0.5 }}>
            {children}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
};
