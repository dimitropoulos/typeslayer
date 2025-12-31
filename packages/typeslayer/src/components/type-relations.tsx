/** biome-ignore-all lint/suspicious/noArrayIndexKey: because daddy said so */
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { InlineCode, panelBackground } from "@typeslayer/common";
import { typeRelationInfo } from "@typeslayer/validate";
import { useCallback, useState } from "react";
import {
  type LinksToType,
  useGetLinksToTypeId,
  useGetResolvedTypeById,
  useGetTracesRelatedToTypeId,
} from "../hooks/tauri-hooks";
import type { LinkKind } from "../types/type-graph";
import { CenterLoader } from "./center-loader";
import { Code } from "./code";
import { ShowMoreChildren } from "./show-more-children";
import { VerticalTab } from "./tab-label";
import { getHumanReadableName, TypeSummary } from "./type-summary";

const LastDitchEffort = ({ typeId }: { typeId: number }) => {
  const { data: events, isLoading } = useGetTracesRelatedToTypeId({ typeId });

  if (isLoading) {
    return <CenterLoader />;
  }

  if (events?.length === 0) {
    return (
      <Stack gap={1}>
        <Typography color="textSecondary">
          no other types reference <InlineCode>{typeId}</InlineCode>
        </Typography>
        <Typography color="textDisabled" maxWidth="610px">
          that means that there are no other types that have relations pointing
          to this type. this type may still have types it points to (which
          you'll see on the panel to the left). TypeSlayer also went ahead and
          searched all trace events for references to this type and didn't find
          anything. it's pretty common - basically this is a type that was
          either a top level export or was never used by anything else in your
          program (or both).
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

function TargetsTabs({ linksToTypeId }: { linksToTypeId: LinksToType }) {
  const [selectedTab, setSelectedTab] = useState<LinkKind | undefined>(
    linksToTypeId[0][0],
  );

  const handleTabChange = useCallback((_event: unknown, value: LinkKind) => {
    setSelectedTab(value);
  }, []);

  const handleSelectChange = useCallback(
    (event: SelectChangeEvent<LinkKind>) => {
      setSelectedTab(event?.target.value);
    },
    [],
  );

  const theme = useTheme();

  const isSmallWidth = useMediaQuery(theme.breakpoints.down("lg"));

  return (
    <Stack
      sx={{
        flexDirection: isSmallWidth ? "column" : "row",
        backgroundColor: panelBackground,
        border: 1,
        borderColor: "divider",
        p: 2,
        spacing: 1,
        flexShrink: 0,
        overflowY: "hidden",
        overflowX: "auto",
      }}
    >
      {isSmallWidth ? (
        <Select
          value={selectedTab}
          onChange={handleSelectChange}
          sx={{ flexShrink: 0, mb: 2 }}
          variant="outlined"
        >
          {linksToTypeId.map(([kind, nodes]) => (
            <MenuItem key={kind} value={kind}>
              <Stack>
                <Typography
                  sx={{
                    ...(selectedTab === kind ? { fontWeight: "bold" } : {}),
                  }}
                >
                  {typeRelationInfo[kind].target.title}
                </Typography>
                <Typography
                  sx={{
                    color: "secondary.main",
                    fontWeight: "bold",
                  }}
                >
                  {nodes.length.toLocaleString()}
                </Typography>
              </Stack>
            </MenuItem>
          ))}
        </Select>
      ) : (
        <Tabs
          onChange={handleTabChange}
          value={selectedTab}
          orientation="vertical"
          sx={{ mr: 3, flexShrink: 0 }}
        >
          {linksToTypeId.map(([kind, nodes]) => (
            <VerticalTab
              key={kind}
              label={typeRelationInfo[kind].target.title}
              count={nodes.length}
              value={kind}
            />
          ))}
        </Tabs>
      )}
      <Stack sx={{ width: "100%" }}>
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
                  <TypeSummary
                    typeId={id}
                    flags={[]}
                    name={name}
                    key={`${id}-${index}`}
                    showFlags={false}
                  />
                </Stack>
              );
            })}
        </ShowMoreChildren>
      </Stack>
    </Stack>
  );
}

export const TypeRelationsContent = ({ typeId }: { typeId: number }) => {
  const { data: linksToTypeId, isLoading } = useGetLinksToTypeId(typeId);

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
  typeId,
  onClose,
}: {
  typeId: number;
  onClose: () => void;
}) => {
  const { data: resolvedType } = useGetResolvedTypeById(typeId);

  if (!resolvedType) {
    return null;
  }

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        Type Relations to{" "}
        <TypeSummary
          typeId={resolvedType.id}
          name={getHumanReadableName(resolvedType)}
          flags={resolvedType.flags}
          showFlags={false}
          suppressActions
        />
      </DialogTitle>
      <DialogContent sx={{ m: 0, py: 0 }}>
        <TypeRelationsContent typeId={resolvedType.id} />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
