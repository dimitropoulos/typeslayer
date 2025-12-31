import {
  GeneratingTokens,
  Hub,
  PowerSettingsNew,
  ZoomIn,
} from "@mui/icons-material";
import {
  Box,
  Divider,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
} from "@mui/material";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { InlineCode } from "@typeslayer/common";
import type { FC, JSX } from "react";
import { useEventCounts } from "../hooks";

export type HeaderNavigationItem = {
  kind: "header";
  title: string;
};

export type SegmentNavigationItem = {
  kind: "segment";
  segment: string;
  title: string;
  icon: JSX.Element;
  progress?: JSX.Element;
};

export type DividerNavigationItem = {
  kind: "divider";
};

export type ExpanderNavigationItem = {
  kind: "expander";
};

export type ActionNavigationItem = {
  kind: "action";
  action: FC<{ collapsed: boolean }>;
};

export type NavigationItem =
  | HeaderNavigationItem
  | SegmentNavigationItem
  | DividerNavigationItem
  | ExpanderNavigationItem
  | ActionNavigationItem;

const EventCount = ({ eventName }: { eventName: string }) => {
  const { data: counts } = useEventCounts();
  const count = counts?.[eventName] ?? 0;

  return <InlineCode>{count}</InlineCode>;
};

export const NAVIGATION = [
  {
    kind: "header",
    title: "Events",
  },
  {
    kind: "segment",
    segment: "events/app_started_success/metadata",
    title: "App Started Success",
    icon: <PowerSettingsNew color="success" />,
    progress: <EventCount eventName="app_started_success" />,
  },
  {
    kind: "segment",
    segment: "events/app_started_fail/metadata",
    title: "App Started Fail",
    icon: <PowerSettingsNew color="error" />,
    progress: <EventCount eventName="app_started_fail" />,
  },
  {
    kind: "segment",
    segment: "events/generate_trace_success/metadata",
    title: "Generate Trace Success",
    icon: <GeneratingTokens color="success" />,
    progress: <EventCount eventName="generate_trace_success" />,
  },
  {
    kind: "segment",
    segment: "events/generate_trace_fail/metadata",
    title: "Generate Trace Fail",
    icon: <GeneratingTokens color="error" />,
    progress: <EventCount eventName="generate_trace_fail" />,
  },
  {
    kind: "segment",
    segment: "events/analyze_trace_success/metadata",
    title: "Analyze Trace Success",
    icon: <ZoomIn color="success" />,
    progress: <EventCount eventName="analyze_trace_success" />,
  },
  {
    kind: "segment",
    segment: "events/analyze_trace_fail/metadata",
    title: "Analyze Trace Fail",
    icon: <ZoomIn color="error" />,
    progress: <EventCount eventName="analyze_trace_fail" />,
  },
  {
    kind: "segment",
    segment: "events/type_graph_success/metadata",
    title: "Type Graph Success",
    icon: <Hub color="success" />,
    progress: <EventCount eventName="type_graph_success" />,
  },
  {
    kind: "segment",
    segment: "events/type_graph_fail/metadata",
    title: "Type Graph Fail",
    icon: <Hub color="error" />,
    progress: <EventCount eventName="type_graph_fail" />,
  },
  {
    kind: "header",
    title: "Explore",
  },
  {
    kind: "segment",
    segment: "explore/app-started",
    title: "App Started",
    icon: <PowerSettingsNew />,
  },
  {
    kind: "segment",
    segment: "explore/generate-trace",
    title: "Generate Trace",
    icon: <GeneratingTokens />,
  },
  {
    kind: "segment",
    segment: "explore/analyze-trace",
    title: "Analyze Trace",
    icon: <ZoomIn />,
  },
  {
    kind: "segment",
    segment: "explore/type-graph",
    title: "Type Graph",
    icon: <Hub />,
  },
] as const satisfies NavigationItem[];

export const RenderNavItem = ({
  item,
  index,
  collapsed,
}: {
  item: NavigationItem;
  index: number;
  collapsed: boolean;
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const activePath = location.pathname;

  if (item.kind === "expander") {
    return (
      <Box
        component="li"
        key={`nav-expander-${index}`}
        sx={{
          listStyle: "none",
          flex: "1 1 auto",
          minHeight: 0,
        }}
      />
    );
  }

  if (item.kind === "action") {
    const Action = item.action;
    return (
      <Box
        key={`nav-action-${index}`}
        component="li"
        sx={{
          listStyle: "none",
          display: "flex",
          px: 1,
          justifyContent: collapsed ? "center" : "flex-start",
          flex: "0 0 auto",
        }}
      >
        <Action collapsed={collapsed} />
      </Box>
    );
  }

  if (item.kind === "header") {
    // hide group headers when the sidebar is collapsed (show icons only)
    if (collapsed) {
      return null;
    }
    return (
      <ListSubheader
        key={item.title}
        sx={{
          flex: "0 0 auto",
        }}
      >
        {item.title}
      </ListSubheader>
    );
  }
  if (item.kind === "divider") {
    return <Divider key={Math.random()} sx={{ my: 1, flex: "0 0 auto" }} />;
  }

  const segment = item.segment as string | undefined;
  if (!segment) {
    return null;
  }

  const to = segment.startsWith("/") ? segment : `/${segment}`;

  const selected =
    activePath === to ||
    to.startsWith(activePath.slice(0, activePath.lastIndexOf("/") + 1));

  return (
    <ListItemButton
      key={`${to}-${index}`}
      selected={selected}
      onClick={() => {
        navigate({ to });
      }}
      sx={{
        justifyContent: collapsed ? "center" : "flex-start",
        px: 1,
        py: 0.5,
        flex: "0 0 auto",
        transition: theme =>
          theme.transitions.create(["background-color", "padding"], {
            duration: 200,
          }),
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: collapsed ? 0 : 38,
          justifyContent: "center",
          flexShrink: 0,
          display: "flex",
          minHeight: "16px",
        }}
      >
        {item.icon}
      </ListItemIcon>
      {!collapsed && <ListItemText primary={item.title} />}
      {!collapsed ? (item.progress ?? null) : null}
    </ListItemButton>
  );
};
