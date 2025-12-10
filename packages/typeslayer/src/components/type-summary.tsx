import { Hub, Search, Share } from "@mui/icons-material";
import { Chip, IconButton, Stack, Typography } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import type { ResolvedType } from "@typeslayer/validate";
import { useCallback, useState } from "react";
import { TypeRelationsDialog } from "./type-relations-dialog";

export const getHumanReadableName = (
  resolvedType: ResolvedType | undefined,
): string => {
  const isLiteral =
    resolvedType?.flags.length === 1 &&
    (resolvedType.flags[0] === "StringLiteral" ||
      resolvedType.flags[0] === "NumberLiteral" ||
      resolvedType.flags[0] === "BooleanLiteral" ||
      resolvedType.flags[0] === "BigIntLiteral");
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
  suppressActions = false,
}: {
  id: number;
  name: string;
  suppressActions?: boolean;
}) {
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
        <>
          <OpenInNetworkAction typeId={id} />
          <OpenInSearchAction typeId={id} />
        </>
      )}
    </Stack>
  );
}
