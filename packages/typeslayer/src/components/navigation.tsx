import {
  AutoAwesome,
  Biotech,
  Dashboard,
  Description,
  Dvr,
  EmojiEvents,
  Hub,
  PlayCircle,
  Search,
  Settings,
  Speed,
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
import type { FC, JSX } from "react";
import dimitropoulosAvatar from "../assets/dimitropoulos.png";
import { AiMcpProgress } from "../pages/mcp";
import { ActionBar } from "./action-bar";

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
    kind: "segment",
    segment: "start/select-code",
    title: "Start",
    icon: <PlayCircle />,
  },
  {
    kind: "segment",
    segment: "search",
    title: "Search Types",
    icon: <Search />,
  },
  {
    kind: "segment",
    segment: "award-winners/largest-union",
    title: "Award Winners",
    icon: <EmojiEvents />,
  },
  {
    kind: "segment",
    segment: "type-network",
    title: "Type Network",
    icon: <Hub />,
  },
  {
    kind: "segment",
    segment: "treemap",
    title: "Treemap",
    icon: <Dashboard />,
  },
  {
    kind: "segment",
    segment: "perfetto",
    title: "Perfetto",
    icon: <Speed />,
  },
  {
    kind: "segment",
    segment: "speedscope",
    title: "SpeedScope",
    icon: <Biotech />,
  },
  {
    kind: "segment",
    segment: "raw-data/analyze-trace",
    title: "Raw Data",
    icon: <Description />,
  },
  {
    kind: "divider",
  },
  {
    kind: "header",
    title: "Integrations",
  },
  {
    kind: "segment",
    segment: "mcp/setup",
    title: "AI MCP Server",
    icon: <AutoAwesome />,
    progress: <AiMcpProgress variant="icon" />,
  },
  {
    kind: "segment",
    segment: "cicd-integration",
    title: "CI/CD Integration",
    icon: <Dvr />,
  },
  {
    kind: "segment",
    segment: "settings",
    title: "Settings",
    icon: <Settings />,
  },
  {
    kind: "expander",
  },
  {
    kind: "action",
    action: ActionBar,
  },
  {
    kind: "divider",
  },
  {
    kind: "segment",
    segment: "about",
    title: "by dimitropoulos",
    icon: (
      <img
        src={dimitropoulosAvatar}
        alt="dimitropoulos avatar"
        style={{ width: 20, height: 20, borderRadius: "50%" }}
      />
    ),
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

  // If the configured segment includes a child (e.g. "award-winners/type-instantiation-limit")
  // treat the navigation item as active for any path under the root ("/award-winners/*").
  const rootSegment = segment?.includes("/") ? `/${segment.split("/")[0]}` : to;
  const selected =
    activePath === to ||
    activePath.startsWith(`${to}/`) ||
    activePath === rootSegment ||
    activePath.startsWith(`${rootSegment}/`);

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
