import {
  Alert,
  Box,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Tab,
  Tabs,
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
  TypeId,
} from "@typeslayer/validate";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { CenterLoader } from "../../components/center-loader";
import { Code } from "../../components/code";
import { DisplayRecursiveType } from "../../components/display-recursive-type";
import { NoData } from "../../components/no-data";
import { TabLabel } from "../../components/tab-label";
import { TypeSummary } from "../../components/type-summary";
import { extractPath } from "../../components/utils";
import {
  useAnalyzeTrace,
  useGetResolvedTypeById,
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
  const depthLimitKey = getDepthLimitsProperty(awardId);
  const [selectedTab, setSelectedTab] = useState<"type" | "json">("type");

  const { data: analyzeTrace } = useAnalyzeTrace();

  const handleTypeClick = useCallback((index: number) => {
    setSelectedIndex(index);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, []);

  const isLoading = relativePaths.isLoading || projectRoot.isLoading;

  const data = (analyzeTrace?.depthLimits[depthLimitKey] || []) as L[];
  const first: L | undefined = data[0];

  const hasItems = data.length > 0;

  const hasData =
    relativePaths.data !== undefined &&
    projectRoot.data !== undefined &&
    analyzeTrace;

  const nonePresent = (
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

        {isLoading ? (
          <CenterLoader />
        ) : hasData ? (
          hasItems ? (
            <List>
              {data.map((current, index) => (
                <LimitListItem
                  typeId={getTypeId(current)}
                  key={getKey(current)}
                  inlineBarGraph={inlineBarGraph(current, first)}
                  onClick={() => handleTypeClick(index)}
                  selected={index === selectedIndex}
                />
              ))}
            </List>
          ) : (
            nonePresent
          )
        ) : (
          <NoData />
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
          <Tabs
            value={selectedTab}
            onChange={(_, value) => setSelectedTab(value)}
            sx={{ mb: 2 }}
          >
            <Tab label={<TabLabel label="Type" count={null} />} value="type" />
            <Tab
              label={<TabLabel label="Trace Event" count={null} />}
              value="json"
            />
          </Tabs>

          {selectedTab === "type" ? (
            <DisplayRecursiveType id={getTypeId(data[selectedIndex])} />
          ) : null}

          {selectedTab === "json" ? (
            <Code
              lang="json"
              value={JSON.stringify(data[selectedIndex], null, 2)}
            />
          ) : null}
        </Box>
      ) : null}
    </Stack>
  );
};

const LimitListItem = ({
  typeId,
  inlineBarGraph,
  onClick,
  selected,
}: {
  typeId: TypeId;
  inlineBarGraph: ReactNode;
  onClick: () => void;
  selected: boolean;
}) => {
  const { data: resolvedType, isLoading } = useGetResolvedTypeById(typeId);

  if (isLoading) {
    return (
      <ListItemText>
        <CenterLoader />
      </ListItemText>
    );
  }

  if (!resolvedType) {
    return (
      <ListItemText>
        <Typography color="error">
          Type {typeId} not found in type registry
        </Typography>
      </ListItemText>
    );
  }

  return (
    <ListItemButton onClick={onClick} selected={selected}>
      <ListItemText>
        <TypeSummary resolvedType={resolvedType} suppressActions />
        <Stack gap={0.5}>
          <MaybePathCaption maybePath={extractPath(resolvedType)} />
          {inlineBarGraph}
        </Stack>
      </ListItemText>
    </ListItemButton>
  );
};
