import { Hub, Search, Share } from "@mui/icons-material";
import { Chip, IconButton, Skeleton, Stack, Typography } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import type { ResolvedType } from "@typeslayer/validate";
import { useCallback, useState } from "react";
import { TypeRelationsDialog } from "./type-relations-dialog";

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
  const viewInTypeNetwork = useCallback(() => {
    navigate({ to: `/type-network/${typeId}` });
  }, [navigate, typeId]);

  return (
    <IconButton
      className="summaryAction"
      size="small"
      title="view in Type Network"
      onClick={viewInTypeNetwork}
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

const OpenRelationsAction = ({
  resolvedType,
}: {
  resolvedType: ResolvedType;
}) => {
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
        <TypeRelationsDialog
          resolvedType={resolvedType}
          onClose={onCloseDialog}
        />
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
  showFlags = false,
  resolvedType,
  suppressActions = false,
  loading = false,
}: {
  showFlags?: boolean;
  resolvedType: ResolvedType;
  suppressActions?: boolean;
  loading?: boolean;
}) {
  if (loading) {
    return <TypeSummarySkeleton showFlags={showFlags} />;
  }

  const { id, flags } = resolvedType;
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
        {getHumanReadableName(resolvedType)}
      </Typography>
      <Typography sx={{ fontFamily: "monospace" }}>id:{id}</Typography>
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
          <OpenInNetworkAction typeId={resolvedType.id} />
          <OpenInSearchAction typeId={resolvedType.id} />
          <OpenRelationsAction resolvedType={resolvedType} />
        </>
      )}
    </Stack>
  );
}

export function SimpleTypeSummary({
  id,
  name,
  loading = false,
  suppressActions = false,
}: {
  id: number;
  name: string;
  loading?: boolean;
  suppressActions?: boolean;
}) {
  if (loading) {
    return <TypeSummarySkeleton showFlags={false} />;
  }

  return (
    <Stack
      direction="row"
      key={id}
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
      <Typography sx={{ fontFamily: "monospace" }}>id:{id}</Typography>
      {suppressActions ? null : (
        <>
          <OpenInNetworkAction typeId={id} />
          <OpenInSearchAction typeId={id} />
        </>
      )}
    </Stack>
  );
}
