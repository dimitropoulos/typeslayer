import { Chip, Stack, Typography } from "@mui/material";
import type { ResolvedType } from "@typeslayer/validate";

export const getHumanReadableName = (resolvedType: ResolvedType): string => {
  const isLiteral =
    resolvedType.flags.length === 1 &&
    (resolvedType.flags[0] === "StringLiteral" ||
      resolvedType.flags[0] === "NumberLiteral" ||
      resolvedType.flags[0] === "BooleanLiteral" ||
      resolvedType.flags[0] === "BigIntLiteral");
  if (isLiteral && typeof resolvedType.display === "string") {
    return resolvedType.display;
  }

  if (
    "symbolName" in resolvedType &&
    typeof resolvedType.symbolName === "string"
  ) {
    return resolvedType.symbolName;
  }

  if (
    "intrinsicName" in resolvedType &&
    typeof resolvedType.intrinsicName === "string"
  ) {
    return resolvedType.intrinsicName;
  }

  return "<anonymous>";
};

export function TypeSummary({
  onClick = () => {},
  showFlags = false,
  resolvedType,
}: {
  onClick?: () => void;
  showFlags?: boolean;
  resolvedType: ResolvedType;
}) {
  const { id, flags } = resolvedType;

  return (
    <Stack
      direction="row"
      gap={1}
      onClick={onClick}
      sx={{ cursor: "pointer", alignItems: "center" }}
    >
      <Typography color="secondary" sx={{ fontFamily: "monospace" }}>
        {getHumanReadableName(resolvedType)}
      </Typography>
      <Typography sx={{ fontFamily: "monospace" }}>id:{id}</Typography>
      {showFlags
        ? flags.map((flag: (typeof flags)[number]) => (
            <Chip
              variant="filled"
              key={flag}
              label={flag}
              size="small"
              sx={{ height: 20 }}
            />
          ))
        : null}
    </Stack>
  );
}

export function SimpleTypeSummary({
  onClick = () => {},
  id,
  name,
}: {
  onClick?: () => void;
  id: number;
  name: string;
}) {
  return (
    <Stack
      direction="row"
      gap={1}
      onClick={onClick}
      sx={{ cursor: "pointer", alignItems: "center" }}
    >
      <Typography color="secondary" sx={{ fontFamily: "monospace" }}>
        {name}
      </Typography>
      <Typography sx={{ fontFamily: "monospace" }}>id:{id}</Typography>
    </Stack>
  );
}
