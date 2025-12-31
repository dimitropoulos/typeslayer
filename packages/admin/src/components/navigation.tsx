import { ReportGmailerrorred, ThumbUp } from "@mui/icons-material";
import {
  Box,
  Divider,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
} from "@mui/material";
import { useLocation, useNavigate } from "@tanstack/react-router";
import type { FC, JSX } from "react";

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

export const NAVIGATION = [
  {
    kind: "header",
    title: "Events",
  },
  {
    kind: "segment",
    segment: "events/app-started-success",
    title: "App Started Success",
    icon: <ThumbUp />,
  },
  {
    kind: "segment",
    segment: "events/app-started-fail",
    title: "App Started Fail",
    icon: <ReportGmailerrorred />,
  },
  {
    kind: "segment",
    segment: "events/generate-trace-success",
    title: "Generate Trace Success",
    icon: <ThumbUp />,
  },
  {
    kind: "segment",
    segment: "events/generate-trace-fail",
    title: "Generate Trace Fail",
    icon: <ReportGmailerrorred />,
  },
  {
    kind: "segment",
    segment: "events/analyze-trace-success",
    title: "Analyze Trace Success",
    icon: <ThumbUp />,
  },
  {
    kind: "segment",
    segment: "events/analyze-trace-fail",
    title: "Analyze Trace Fail",
    icon: <ReportGmailerrorred />,
  },
  {
    kind: "segment",
    segment: "events/type-graph-success",
    title: "Type Graph Success",
    icon: <ThumbUp />,
  },
  {
    kind: "segment",
    segment: "events/type-graph-fail",
    title: "Type Graph Fail",
    icon: <ReportGmailerrorred />,
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

  const selected = activePath === to;

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
