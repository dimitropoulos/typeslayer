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
    segment: "search-types",
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
