import {
  Alert,
  Box,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import type {
  EventChecktypes__CheckCrossProductUnion_DepthLimit,
  EventChecktypes__CheckTypeRelatedTo_DepthLimit,
  EventChecktypes__GetTypeAtFlowNode_DepthLimit,
  EventChecktypes__InstantiateType_DepthLimit,
  EventChecktypes__RecursiveTypeRelatedTo_DepthLimit,
  EventChecktypes__RemoveSubtypes_DepthLimit,
  EventChecktypes__TraceUnionsOrIntersectionsTooLarge_DepthLimit,
  EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit,
} from "@typeslayer/validate";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { DisplayRecursiveType } from "../../components/display-recursive-type";
import { TypeSummary } from "../../components/type-summary";
import { extractPath } from "../../components/utils";
import {
  useAnalyzeTrace,
  useProjectRoot,
  useRelativePaths,
} from "../../hooks/tauri-hooks";
import {
  AWARD_SELECTOR_COLUMN_WIDTH,
  awards,
  MaybePathCaption,
} from "./awards";
import { TitleSubtitle } from "./title-subtitle";
import {
  getDepthLimitsProperty,
  type TypeLevelLimitAwardId,
} from "./type-level-limits";
import { useTypeRegistry } from "./use-type-registry";

type LimitType =
  | EventChecktypes__InstantiateType_DepthLimit
  | EventChecktypes__RecursiveTypeRelatedTo_DepthLimit
  | EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit
  | EventChecktypes__CheckCrossProductUnion_DepthLimit
  | EventChecktypes__CheckTypeRelatedTo_DepthLimit
  | EventChecktypes__GetTypeAtFlowNode_DepthLimit
  | EventChecktypes__RemoveSubtypes_DepthLimit
  | EventChecktypes__TraceUnionsOrIntersectionsTooLarge_DepthLimit;

export const ShowTypeLimit = <L extends LimitType>({
  getKey,
  getTypeId,
  icon: Icon,
  inlineBarGraph,
  notFound,
  title,
  awardId,
}: {
  getKey: (current: L) => string;
  getTypeId: (current: L) => number;
  icon: (typeof awards)[keyof typeof awards]["icon"];
  inlineBarGraph: (current: L, first: L) => ReactNode;
  notFound: string;
  title: string;
  awardId: TypeLevelLimitAwardId;
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const relativePaths = useRelativePaths();
  const projectRoot = useProjectRoot();
  const typeRegistry = useTypeRegistry();
  const depthLimitKey = getDepthLimitsProperty(awardId);

  const { data: analyzeTrace } = useAnalyzeTrace();

  const handleTypeClick = useCallback((index: number) => {
    setSelectedIndex(index);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, []);

  if (
    relativePaths.isLoading ||
    projectRoot.isLoading ||
    relativePaths.data === undefined ||
    projectRoot.data === undefined
  ) {
    return null;
  }

  const data = (analyzeTrace?.depthLimits[depthLimitKey] || []) as L[];
  const first: L | undefined = data[0];

  const hasItems = !!first;
  const noneFound = (
    <Alert severity="success" sx={{ mx: 1 }}>
      {notFound}
      <br />
      <br />
      That's a good thing!
    </Alert>
  );

  return (
    <Stack
      sx={{
        flexDirection: "row",
        alignItems: "flex-start",
        height: "100%",
      }}
    >
      <Stack
        sx={{
          width: AWARD_SELECTOR_COLUMN_WIDTH,
          background: hasItems ? "#000000" : "transparent",
          flexShrink: 0,
          gap: 2,
          p: 1,
          pt: 2,
          overflowY: "auto",
          maxHeight: "100%",
          minHeight: "100%",
          borderRight: 1,
          borderColor: hasItems ? "divider" : "transparent",
        }}
      >
        <TitleSubtitle
          title={title}
          subtitle={awards[awardId].description}
          icon={<Icon fontSize="large" />}
        />
        {hasItems ? (
          <List>
            {data.map((current, index) => {
              const typeId = getTypeId(current);
              const resolvedType = typeRegistry[typeId];
              const key = getKey(current);

              if (!resolvedType) {
                return (
                  <ListItemText key={key}>
                    <Typography color="error">
                      Type {typeId} not found in type registry
                    </Typography>
                  </ListItemText>
                );
              }

              return (
                <ListItemButton
                  key={key}
                  onClick={() => handleTypeClick(index)}
                  selected={index === selectedIndex}
                >
                  <ListItemText>
                    <TypeSummary resolvedType={resolvedType} suppressActions />
                    <Stack gap={0.5}>
                      <MaybePathCaption maybePath={extractPath(resolvedType)} />
                      {inlineBarGraph(current, first)}
                    </Stack>
                  </ListItemText>
                </ListItemButton>
              );
            })}
          </List>
        ) : (
          noneFound
        )}
      </Stack>

      {hasItems ? (
        <Box
          sx={{
            p: 3,
            overflowY: "auto",
            maxHeight: "100%",
            width: "100%",
            height: "100%",
          }}
          ref={scrollContainerRef}
        >
          <DisplayRecursiveType id={getTypeId(data[selectedIndex])} />
        </Box>
      ) : null}
    </Stack>
  );
};
