import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import type { ResolvedType } from "@typeslayer/validate";
import { useTraceJson, useTypeGraph } from "../hooks/tauri-hooks";
import { useTypeRegistry } from "../pages/award-winners/use-type-registry";
import { CenterLoader } from "./center-loader";
import { Code } from "./code";
import { InlineCode } from "./inline-code";
import { TypeSummary } from "./type-summary";

const LastDitchEffort = ({ typeId }: { typeId: number }) => {
  const { data: traceJson, isLoading } = useTraceJson();

  if (isLoading) {
    return <CenterLoader />;
  }

  if (!traceJson) {
    return null;
  }

  const events = traceJson.filter(event => {
    if (!("name" in event)) {
      return false;
    }

    switch (event.name) {
      case "checkTypeParameterDeferred":
        return event.args.parent === typeId || event.args.id === typeId;

      case "checkTypeRelatedTo_DepthLimit":
      case "structuredTypeRelatedTo":
      case "traceUnionsOrIntersectionsTooLarge_DepthLimit":
      case "typeRelatedToDiscriminatedType_DepthLimit":
        return event.args.sourceId === typeId || event.args.targetId === typeId;

      case "checkCrossProductUnion_DepthLimit":
      case "removeSubtypes_DepthLimit":
        return event.args.typeIds.includes(typeId);

      case "instantiateType_DepthLimit":
        return event.args.typeId === typeId;

      case "recursiveTypeRelatedTo_DepthLimit":
        return (
          event.args.sourceId === typeId ||
          event.args.targetId === typeId ||
          event.args.sourceIdStack.includes(typeId) ||
          event.args.targetIdStack.includes(typeId)
        );

      default:
        return false;
    }
  });

  if (events.length === 0) {
    return (
      <Stack gap={1}>
        <Typography>that's tough.</Typography>
        <Typography>
          that means that TypeScript didn't record any more information about
          this type other than that it exists in your code.
        </Typography>
        <Typography>
          one situation this can happen is for a top-level package export, so
          check those.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack>
      <Typography>so what do you do next?</Typography>
      <Typography gutterBottom>
        it's tough. the last thing we can do is perform a search of all traces
        that contain this type id:
      </Typography>
      <Code value={JSON.stringify(events, null, 2)} />
      <Typography sx={{ mt: 2 }}>
        Now, what you shoudl do next is take the timestamp (the{" "}
        <InlineCode secondary>ts</InlineCode> field) of any of the events
        returned above, and look at that time in{" "}
        <Link href="/perfetto">the Perfetto module</Link>.
      </Typography>
      <Typography>
        there, you'll see what other sorts of things TypeScript was doing at
        that time (and what file it was checking).
      </Typography>
    </Stack>
  );
};

export const TypeRelationsDialog = ({
  resolvedType,
  onClose,
}: {
  resolvedType: ResolvedType;
  onClose: () => void;
}) => {
  const { id: typeId } = resolvedType;

  const { data: typeGraph, isLoading } = useTypeGraph();
  const { typeRegistry } = useTypeRegistry();

  const targets = typeGraph?.links.filter(node => node.target === typeId) ?? [];

  const noneFound =
    targets.length === 0 ? <LastDitchEffort typeId={typeId} /> : null;

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        types related to{" "}
        <TypeSummary resolvedType={resolvedType} suppressActions />
      </DialogTitle>
      <DialogContent dividers>
        {isLoading ? (
          <CenterLoader />
        ) : (
          <Stack gap={0.5}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {targets.length} type{targets.length === 1 ? "" : "s"} referenced
              by this type:
            </Typography>
            {targets.length === 0
              ? noneFound
              : targets?.map(({ source, kind }) => {
                  const resolvedType = typeRegistry?.[source];
                  if (!resolvedType) {
                    return (
                      <Typography key={source} color="error">
                        Could not find type with id {source} in registry
                      </Typography>
                    );
                  }

                  return (
                    <Stack key={source} sx={{ gap: 1, flexDirection: "row" }}>
                      <Typography>{kind}:</Typography>
                      <TypeSummary resolvedType={resolvedType} key={source} />
                    </Stack>
                  );
                })}
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
