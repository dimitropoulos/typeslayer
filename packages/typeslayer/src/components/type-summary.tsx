import { Hub, Search, Share } from "@mui/icons-material";
import { Chip, IconButton, Skeleton, Stack, Typography } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import type { ResolvedType } from "@typeslayer/validate";
import { useCallback, useState } from "react";
import { TypeRelationsDialog } from "./type-relations";

export const getHumanReadableName = (
  resolvedType: ResolvedType | undefined,
): string => {
  if (!resolvedType) {
    return "<unknown>";
  }

  const isLiteral = resolvedType.flags.some(
    flag =>
      flag === "StringLiteral" ||
      flag === "NumberLiteral" ||
      flag === "BooleanLiteral" ||
      flag === "BigIntLiteral",
  );
  if (isLiteral && typeof resolvedType.display === "string") {
    return resolvedType.display;
  }

  if (
    resolvedType &&
    "symbolName" in resolvedType &&
    typeof resolvedType.symbolName === "string"
  ) {
    return resolvedType.symbolName;
  }

  if (
    resolvedType &&
    "intrinsicName" in resolvedType &&
    typeof resolvedType.intrinsicName === "string"
  ) {
    return resolvedType.intrinsicName;
  }

  return "<anonymous>";
};

const OpenInNetworkAction = ({ typeId }: { typeId: number }) => {
  const navigate = useNavigate();
  const viewInTypeGraph = useCallback(() => {
    navigate({ to: `/type-graph/${typeId}` });
  }, [navigate, typeId]);

  return (
    <IconButton
      className="summaryAction"
      size="small"
      title="view in Type Graph"
      onClick={viewInTypeGraph}
      sx={{ my: -1 }}
    >
      <Hub />
    </IconButton>
  );
};

const OpenInSearchAction = ({ typeId }: { typeId: number }) => {
  const navigate = useNavigate();
  const viewInSearch = useCallback(() => {
    navigate({ to: `/search/${typeId}` });
  }, [navigate, typeId]);

  return (
    <IconButton
      className="summaryAction"
      size="small"
      title="view in Search"
      onClick={viewInSearch}
      sx={{ my: -1 }}
    >
      <Search />
    </IconButton>
  );
};

const OpenRelationsAction = ({ typeId }: { typeId: number }) => {
  const [relationsDialogOpen, setRelationsDialogOpen] = useState(false);

  const onOpenDialog = useCallback(() => {
    setRelationsDialogOpen(true);
  }, []);

  const onCloseDialog = useCallback(() => {
    setRelationsDialogOpen(false);
  }, []);

  return (
    <>
      <IconButton
        className="summaryAction"
        size="small"
        title="types related to this type"
        onClick={onOpenDialog}
        sx={{ my: -1 }}
      >
        <Share sx={{ transform: "rotate(180deg)" }} />
      </IconButton>
      {relationsDialogOpen ? (
        <TypeRelationsDialog typeId={typeId} onClose={onCloseDialog} />
      ) : null}
    </>
  );
};

/**
 * Generates a random integer between min (inclusive) and max (inclusive)
 */
const randBetween = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export function TypeSummarySkeleton({
  showFlags = false,
}: {
  showFlags?: boolean;
}) {
  return (
    <Stack
      direction="row"
      gap={1}
      sx={{
        alignItems: "center",
      }}
    >
      <Typography color="secondary" sx={{ fontFamily: "monospace" }}>
        <Skeleton
          sx={{
            width: randBetween(10, 150),
            backgroundColor: t => `${t.palette.secondary.dark}40`,
          }}
        />
      </Typography>
      <Typography sx={{ fontFamily: "monospace" }}>
        <Skeleton width={randBetween(50, 70)} />
      </Typography>
      {showFlags
        ? Array.from({ length: randBetween(1, 2) }).map((_, i) => (
            <Skeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: I literally don't care
              key={i}
              width={randBetween(30, 130)}
              sx={{ backgroundColor: t => `${t.palette.primary.dark}40` }}
            />
          ))
        : null}
    </Stack>
  );
}

export function TypeSummary({
  flags,
  loading = false,
  showFlags = false,
  name,
  suppressActions = false,
  typeId,
}: {
  flags: ResolvedType["flags"];
  loading?: boolean;
  name?: string;
  showFlags: boolean;
  suppressActions?: boolean;
  typeId: number;
}) {
  if (loading) {
    return <TypeSummarySkeleton showFlags={showFlags} />;
  }

  return (
    <Stack
      direction="row"
      gap={1}
      sx={{
        alignItems: "center",
        "& .summaryAction": { visibility: "hidden" },
        "&:hover .summaryAction": { visibility: "visible" },
      }}
    >
      <Typography color="secondary" sx={{ fontFamily: "monospace" }}>
        {name}
      </Typography>
      <Typography sx={{ fontFamily: "monospace" }}>id:{typeId}</Typography>
      {showFlags
        ? flags.map(flag => (
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
        <>
          <OpenInNetworkAction typeId={typeId} />
          <OpenInSearchAction typeId={typeId} />
          <OpenRelationsAction typeId={typeId} />
        </>
      )}
    </Stack>
  );
}
