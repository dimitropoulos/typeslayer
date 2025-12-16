/** biome-ignore-all lint/suspicious/noArrayIndexKey: because daddy said so */
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Tabs,
  Typography,
} from "@mui/material";
import {
  type ResolvedType,
  type TypeRelationInfo,
  typeRelationInfo,
} from "@typeslayer/validate";
import { type SyntheticEvent, useCallback, useState } from "react";
import {
  type LinksToType,
  useGetLinksToTypeId,
  useGetTracesRelatedToTypeId,
} from "../hooks/tauri-hooks";
import type { LinkKind } from "../types/type-graph";
import { CenterLoader } from "./center-loader";
import { Code } from "./code";
import { InlineCode } from "./inline-code";
import { ShowMoreChildren } from "./show-more-children";
import { VerticalTab } from "./tab-label";
import { SimpleTypeSummary, TypeSummary } from "./type-summary";

const LastDitchEffort = ({ typeId }: { typeId: number }) => {
  const { data: events, isLoading } = useGetTracesRelatedToTypeId({ typeId });

  if (isLoading) {
    return <CenterLoader />;
  }

  if (events?.length === 0) {
    return (
      <Stack gap={1}>
        <Typography color="textSecondary">
          no types found with relations to <InlineCode>{typeId}</InlineCode>.
        </Typography>
        <Typography color="textDisabled" maxWidth="610px">
          that means that TypeScript didn't record any more information about
          this type other than that it exists in your code. it's pretty common -
          basically this is a type that was either a top level export or was
          never used by anything else in your program (or both).
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack gap={1}>
      <Typography color="textSecondary">
        no types found with relations to <InlineCode>{typeId}</InlineCode>.
      </Typography>
      <Typography color="textSecondary">
        so what do you do next? it's tough. the last thing we can do is perform
        a search of all traces that contain this type id:
      </Typography>
      <Code sx={{ my: 1 }} value={JSON.stringify(events, null, 2)} />
      <Typography color="textSecondary">
        what you should do next is take the timestamp (the{" "}
        <InlineCode>ts</InlineCode> field) of any of the events returned above,
        and look at that time in{" "}
        <Link href="/perfetto">the Perfetto module</Link>.
      </Typography>
      <Typography color="textSecondary">
        there, you'll see what other sorts of things TypeScript was doing at
        that time (and what file it was checking).
      </Typography>
    </Stack>
  );
};

const kindToTypesRelationInfo = (kind: LinkKind): TypeRelationInfo => {
  switch (kind) {
    case "typeArgument":
      return typeRelationInfo.typeArguments;

    case "union":
      return typeRelationInfo.unionTypes;

    case "intersection":
      return typeRelationInfo.intersectionTypes;

    case "aliasTypeArgument":
      return typeRelationInfo.aliasTypeArguments;

    case "instantiated":
      return typeRelationInfo.instantiatedType;

    case "substitutionBase":
      return typeRelationInfo.substitutionBaseType;

    case "constraint":
      return typeRelationInfo.constraintType;

    case "indexedAccessObject":
      return typeRelationInfo.indexedAccessObjectType;

    case "indexedAccessIndex":
      return typeRelationInfo.indexedAccessIndexType;

    case "conditionalCheck":
      return typeRelationInfo.conditionalCheckType;

    case "conditionalExtends":
      return typeRelationInfo.conditionalExtendsType;

    case "conditionalTrue":
      return typeRelationInfo.conditionalTrueType;

    case "conditionalFalse":
      return typeRelationInfo.conditionalFalseType;

    case "keyof":
      return typeRelationInfo.keyofType;

    case "alias":
      return typeRelationInfo.aliasType;

    case "evolvingArrayElement":
      return typeRelationInfo.evolvingArrayElementType;

    case "evolvingArrayFinal":
      return typeRelationInfo.evolvingArrayFinalType;

    case "reverseMappedSource":
      return typeRelationInfo.reverseMappedSourceType;

    case "reverseMappedMapped":
      return typeRelationInfo.reverseMappedMappedType;

    case "reverseMappedConstraint":
      return typeRelationInfo.reverseMappedConstraintType;
    default:
      kind satisfies never;
      return "<error>" as never;
  }
};

function TargetsTabs({ linksToTypeId }: { linksToTypeId: LinksToType }) {
  const [selectedTab, setSelectedTab] = useState<LinkKind | undefined>(
    linksToTypeId[0][0],
  );

  const handleTabChange = useCallback(
    (_event: SyntheticEvent, value: LinkKind) => {
      setSelectedTab(value);
    },
    [],
  );

  return (
    <Stack
      sx={{
        flexDirection: "row",
        backgroundColor: "#11111190",
        border: 1,
        borderColor: "divider",
        p: 1,
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <Tabs
        onChange={handleTabChange}
        value={selectedTab}
        orientation="vertical"
        sx={{ mr: 3, flexShrink: 0 }}
      >
        {linksToTypeId.map(([kind, nodes]) => (
          <VerticalTab
            key={kind}
            label={kindToTypesRelationInfo(kind).title}
            count={nodes.length}
            value={kind}
          />
        ))}
      </Tabs>
      <Stack sx={{ overflow: "auto", my: 1, height: "100%", width: "100%" }}>
        <ShowMoreChildren incrementsOf={50}>
          {linksToTypeId
            .filter(([kind]) => kind === selectedTab)
            .flatMap(([, nodes]) => nodes)
            .map(([id, name], index) => {
              return (
                <Stack
                  key={`${id}-${index}`}
                  sx={{ gap: 1, flexDirection: "row" }}
                >
                  <SimpleTypeSummary
                    id={id}
                    name={name}
                    key={`${id}-${index}`}
                  />
                </Stack>
              );
            })}
        </ShowMoreChildren>
      </Stack>
    </Stack>
  );
}

export const TypeRelationsContent = ({
  resolvedType,
}: {
  resolvedType?: ResolvedType | undefined;
}) => {
  const { data: linksToTypeId, isLoading } = useGetLinksToTypeId(
    resolvedType?.id ?? 0,
  );

  if (!resolvedType) {
    return null;
  }

  const { id: typeId } = resolvedType;
  if (typeId <= 0) {
    return null;
  }

  if (isLoading) {
    return <CenterLoader />;
  }

  if (!linksToTypeId) {
    return null;
  }

  if (linksToTypeId.length === 0) {
    return <LastDitchEffort typeId={typeId} />;
  }

  return <TargetsTabs linksToTypeId={linksToTypeId} key={typeId} />;
};

export const TypeRelationsDialog = ({
  resolvedType,
  onClose,
}: {
  resolvedType: ResolvedType;
  onClose: () => void;
}) => {
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        Type Relations to{" "}
        <TypeSummary resolvedType={resolvedType} suppressActions />
      </DialogTitle>
      <DialogContent sx={{ m: 0, py: 0 }}>
        <TypeRelationsContent resolvedType={resolvedType} />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
