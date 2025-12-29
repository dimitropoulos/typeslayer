import {
  Alert,
  AlertTitle,
  Box,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  type SxProps,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import {
  depthLimitInfo,
  type EventChecktypes__CheckCrossProductUnion_DepthLimit,
  type EventChecktypes__CheckTypeRelatedTo_DepthLimit,
  type EventChecktypes__GetTypeAtFlowNode_DepthLimit,
  type EventChecktypes__InstantiateType_DepthLimit,
  type EventChecktypes__RecursiveTypeRelatedTo_DepthLimit,
  type EventChecktypes__RemoveSubtypes_DepthLimit,
  type EventChecktypes__TraceUnionsOrIntersectionsTooLarge_DepthLimit,
  type EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit,
  type TypeId,
} from "@typeslayer/validate";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { CenterLoader } from "../../components/center-loader";
import { Code } from "../../components/code";
import { DisplayRecursiveType } from "../../components/display-recursive-type";
import { NoData } from "../../components/no-data";
import { TabLabel } from "../../components/tab-label";
import {
  getHumanReadableName,
  TypeSummary,
} from "../../components/type-summary";
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
import type { TypeLevelLimitAwardId } from "./type-level-limits";

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
  getListItemTypeId,
  inlineBarGraph,
  awardId,
  tabs,
}: {
  getKey: (current: L) => string;
  getListItemTypeId: (current: L) => number;
  inlineBarGraph: (current: L, first: L) => ReactNode;
  awardId: TypeLevelLimitAwardId;
  tabs: (current: L) => { tabName: string; content: TypeId | TypeId[] }[];
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const relativePaths = useRelativePaths();
  const projectRoot = useProjectRoot();
  const [selectedTab, setSelectedTab] = useState<
    keyof ReturnType<typeof tabs> | "json"
  >("json");

  const { icon: Icon } = awards[awardId];

  const { title, notFound } = depthLimitInfo[awardId];

  const { data: analyzeTrace } = useAnalyzeTrace();

  const handleTypeClick = useCallback((index: number) => {
    setSelectedIndex(index);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, []);

  const isLoading = relativePaths.isLoading || projectRoot.isLoading;

  const data = (analyzeTrace?.depthLimits[awardId] || []) as L[];
  const first: L | undefined = data[0];

  const hasItems = data.length > 0;

  const hasData =
    relativePaths.data !== undefined &&
    projectRoot.data !== undefined &&
    analyzeTrace;

  const nonePresent = (
    <Alert severity="success" sx={{ mx: 1 }}>
      <AlertTitle>{notFound}</AlertTitle>
      That's a good thing!
    </Alert>
  );

  const items = (
    <List>
      {data.map((current, index) => (
        <LimitListItem
          typeId={getListItemTypeId(current)}
          key={getKey(current)}
          inlineBarGraph={inlineBarGraph(current, first)}
          onClick={() => handleTypeClick(index)}
          selected={index === selectedIndex}
        />
      ))}
    </List>
  );

  const currentItem = data[selectedIndex];

  const currentTabContents = currentItem
    ? tabs(currentItem).find(tab => tab.tabName === selectedTab)?.content
    : undefined;

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
          pb: 2,
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
            items
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
            px: 2,
            pb: 2,
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
            <Tab
              label={<TabLabel label="Trace Event" count={null} />}
              value="json"
            />
            {currentItem
              ? tabs(currentItem).map(({ tabName }) => (
                  <Tab
                    key={tabName}
                    label={<TabLabel label={tabName} count={null} />}
                    value={tabName}
                  />
                ))
              : null}
          </Tabs>

          {selectedTab === "json" ? (
            <Code lang="json" value={JSON.stringify(currentItem, null, 2)} />
          ) : (
            <ShowMaybeMany content={currentTabContents} />
          )}
        </Box>
      ) : null}
    </Stack>
  );
};

const ShowMaybeMany = ({
  content,
}: {
  content: TypeId | TypeId[] | undefined;
}) => {
  if (content === undefined) {
    return <Typography>something's wrong. no data for this tab.</Typography>;
  }

  if (Array.isArray(content)) {
    return content.map((typeId, index) => (
      <ResolveTypeSummary
        key={`type-summary-${typeId}-${
          // biome-ignore lint/suspicious/noArrayIndexKey: it's stable
          index
        }`}
        typeId={typeId}
        sx={{ ml: 2, mb: 1 }}
      />
    ));
  }

  return <DisplayRecursiveType key={content} id={content} />;
};

const ResolveTypeSummary = ({
  typeId,
  sx,
}: {
  typeId: TypeId;
  sx: SxProps;
}) => {
  const { data: resolvedType, isLoading } = useGetResolvedTypeById(typeId);
  return (
    <TypeSummary
      typeId={typeId}
      flags={[]}
      name={getHumanReadableName(resolvedType)}
      loading={isLoading}
      showFlags={false}
      sx={sx}
    />
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
        <TypeSummary
          typeId={resolvedType.id}
          flags={resolvedType.flags}
          name={getHumanReadableName(resolvedType)}
          showFlags
          suppressActions
        />
        <Stack gap={0.5}>
          <MaybePathCaption maybePath={extractPath(resolvedType)} />
          {inlineBarGraph}
        </Stack>
      </ListItemText>
    </ListItemButton>
  );
};
