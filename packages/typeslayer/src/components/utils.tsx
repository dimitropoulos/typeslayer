import {
  AutoAwesome,
  Biotech,
  BugReport,
  CameraAlt,
  Dashboard,
  Description,
  Dvr,
  EmojiEvents,
  Help,
  Hub,
  PlayCircle,
  Search,
  Settings,
  Speed,
} from "@mui/icons-material";
import { IconButton, Snackbar, Stack } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import {
  extractPackageName,
  type ResolvedType,
  relativizePath,
} from "@typeslayer/validate";
import { type FC, type JSX, useState } from "react";
import dimitropoulosAvatar from "../assets/dimitropoulos.png";
import { AiMcpProgress } from "../pages/mcp";

const ActionBar: FC<{ collapsed: boolean }> = () => {
  const [screenshotSnackbar, setScreenshotSnackbar] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: "" });

  const handleScreenshot = async () => {
    try {
      const savedPath = await invoke<string>("take_screenshot");
      setScreenshotSnackbar({
        open: true,
        message: savedPath
          ? `Screenshot saved to ${savedPath} and copied to clipboard`
          : "Screenshot captured",
      });
    } catch (error) {
      setScreenshotSnackbar({
        open: true,
        message: `Unable to capture screenshot: ${String(error)}`,
      });
    }
  };

  return (
    <Stack
      sx={{
        width: "100%",
        justifyContent: "center",
        flexDirection: "row",
        gap: 0.5,
        mb: 0.5,
        "& .MuiIconButton-root": {
          color: t => t.palette.text.secondary,
          "&:hover": {
            color: t => t.palette.text.primary,
          },
        },
      }}
    >
      <IconButton onClick={handleScreenshot} title="take a screenshot">
        <CameraAlt />
      </IconButton>
      <IconButton title="report a bug">
        <BugReport />
      </IconButton>
      <IconButton title="help">
        <Help />
      </IconButton>
      <Snackbar
        open={screenshotSnackbar.open}
        autoHideDuration={4000}
        onClose={() => setScreenshotSnackbar({ open: false, message: "" })}
        message={screenshotSnackbar.message}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      />
    </Stack>
  );
};

export const friendlyPath = (
  absolutePath: string | undefined,
  projectRoot: string | undefined,
  relativePaths: boolean | undefined,
) => {
  if (!absolutePath) {
    console.error("missing path", {
      fullPath: absolutePath,
      projectRoot,
      relativePaths,
    });
    return "[Missing Path]";
  }

  if (!relativePaths || !projectRoot) {
    return absolutePath;
  }

  // projectRoot is a file path (package.json), get its directory
  const projectDir = projectRoot.endsWith("package.json")
    ? projectRoot.slice(0, projectRoot.lastIndexOf("/"))
    : projectRoot;

  if (absolutePath.startsWith(`${projectDir}/`)) {
    // remove the project directory from the path and return relative path
    const relativePath = absolutePath.slice(projectDir.length + 1);
    return `./${relativePath}`;
  }
  if (absolutePath === projectDir) {
    return ".";
  }

  const packageName = extractPackageName(absolutePath);
  if (packageName && packageName !== absolutePath) {
    const splitVersionIndex = packageName.indexOf(
      "@",
      packageName.startsWith("@") ? 1 : 0,
    );
    if (splitVersionIndex === -1) {
      // no version found, just return the package name
      return packageName;
    }

    const withoutVersion = packageName.slice(0, splitVersionIndex);

    const locationOfWithoutVersion = absolutePath.lastIndexOf(withoutVersion);
    if (locationOfWithoutVersion === -1) {
      // the package name without version is not found in the absolute path
      return packageName;
    }
    const pathAfterPackageName = absolutePath.slice(
      locationOfWithoutVersion + withoutVersion.length,
    );
    return `${packageName}${pathAfterPackageName}`;
  }

  return relativizePath(projectRoot, absolutePath);
};

export const serverBaseUrl = "http://127.0.0.1:4765";

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    const kb = Math.round(bytes / 1024);
    return `${kb} K`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    const mb = Math.round(bytes / (1024 * 1024));
    return `${mb} M`;
  }
  const gb = Math.round(bytes / (1024 * 1024 * 1024));
  return `${gb} G`;
};

export const useStaticFile = (fileName: string) => {
  return useQuery<string>({
    queryKey: ["outputs", fileName],
    queryFn: async () => {
      const response = await fetch(`${serverBaseUrl}/outputs/${fileName}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${fileName}: ${response.statusText}`);
      }
      return response.text();
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
};

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
    title: "CI/CD",
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

export const extractPath = (resolvedType: ResolvedType) => {
  if (resolvedType.firstDeclaration?.path) {
    return resolvedType.firstDeclaration.path;
  }
  if (resolvedType.referenceLocation?.path) {
    return resolvedType.referenceLocation.path;
  }
  if (resolvedType.destructuringPattern?.path) {
    return resolvedType.destructuringPattern.path;
  }
  return undefined;
};
