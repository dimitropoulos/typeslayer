import { Hub } from "@mui/icons-material";
import { Chip, IconButton, Stack, Typography } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
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
  showFlags = false,
  resolvedType,
  suppressActions = false,
}: {
  showFlags?: boolean;
  resolvedType: ResolvedType;
  suppressActions?: boolean;
}) {
  const { id, flags } = resolvedType;

  const navigate = useNavigate();
  const viewInTypeNetwork = () => {
    navigate({ to: `/type-network/${id}` });
  };

  return (
    <Stack
      direction="row"
      gap={1}
      sx={{
        alignItems: "center",
        "& .viewInTypeNetwork": { visibility: "hidden" },
        "&:hover .viewInTypeNetwork": { visibility: "visible" },
      }}
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
      {suppressActions ? null : (
        <IconButton
          className="viewInTypeNetwork"
          size="small"
          onClick={viewInTypeNetwork}
        >
          <Hub />
        </IconButton>
      )}
    </Stack>
  );
}

export function SimpleTypeSummary({
  id,
  name,
  suppressActions = false,
}: {
  id: number;
  name: string;
  suppressActions?: boolean;
}) {
  const navigate = useNavigate();
  const viewInTypeNetwork = () => {
    navigate({ to: `/type-network/${id}` });
  };

  return (
    <Stack
      direction="row"
      gap={1}
      sx={{
        alignItems: "center",
        "& .viewInTypeNetwork": { visibility: "hidden" },
        "&:hover .viewInTypeNetwork": { visibility: "visible" },
      }}
    >
      <Typography color="secondary" sx={{ fontFamily: "monospace" }}>
        {name}
      </Typography>
      <Typography sx={{ fontFamily: "monospace" }}>id:{id}</Typography>

      {suppressActions ? null : (
        <IconButton
          className="viewInTypeNetwork"
          size="small"
          onClick={viewInTypeNetwork}
        >
          <Hub />
        </IconButton>
      )}
    </Stack>
  );
}
