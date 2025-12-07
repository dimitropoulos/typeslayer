import { ChevronLeft } from "@mui/icons-material";
import {
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Stack,
} from "@mui/material";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import tsLogo from "./assets/ts.png";
import tsNightmareLogo from "./assets/ts-nightmare.png";
import typeslayerLogo from "./assets/typeslayer.png";
import typeslayerNightmareLogo from "./assets/typeslayer-nightmare.png";
import { AuthGate } from "./components/auth-gate";
import { NAVIGATION, type NavigationItem } from "./components/utils";

function AppBrand({
  collapsed,
  nightmare,
}: {
  collapsed?: boolean;
  nightmare?: boolean;
}) {
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 2 }}>
      <img
        src={
          collapsed
            ? nightmare
              ? tsNightmareLogo
              : tsLogo
            : nightmare
              ? typeslayerNightmareLogo
              : typeslayerLogo
        }
        alt="TypeSlayer Logo"
        style={{ width: collapsed ? 34 : 180, height: 26 }}
      />
    </Stack>
  );
}

export function App() {
  const muiTheme = useTheme();
  const isMdUp = useMediaQuery(muiTheme.breakpoints.up("md"));
  const location = useLocation();
  const navigate = useNavigate();

  const drawerWidth = 224;

  const collapsedWidth = 64;

  const [open, setOpen] = useState<boolean>(isMdUp);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [authenticated, setAuthenticated] = useState<boolean>(false);

  // keep open state in sync with screen size
  useEffect(() => {
    setOpen(isMdUp);
  }, [isMdUp]);

  // Global F11 fullscreen toggle for the whole Tauri app
  useEffect(() => {
    const onKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "F11") {
        e.preventDefault();
        const win = getCurrentWindow();
        const isFs = await win.isFullscreen();
        await win.setFullscreen(!isFs);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const activePath = location.pathname;

  const handleToggle = () => {
    // on md+ allow collapsing (show icons only)
    if (isMdUp) {
      setCollapsed(c => !c);
    } else {
      setOpen(o => !o);
    }
  };

  if (!authenticated) {
    return <AuthGate onAuthorized={() => setAuthenticated(true)} />;
  }

  const renderNavItem = (item: NavigationItem, index: number) => {
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
      return <Divider key={Math.random()} sx={{ mt: 0.5, flex: "0 0 auto" }} />;
    }

    const segment = item.segment as string | undefined;
    if (!segment) {
      return null;
    }

    const to = segment.startsWith("/") ? segment : `/${segment}`;

    // If the configured segment includes a child (e.g. "award-winners/type-instantiation-limit")
    // treat the navigation item as active for any path under the root ("/award-winners/*").
    const rootSegment = segment?.includes("/")
      ? `/${segment.split("/")[0]}`
      : to;
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
          if (!isMdUp) {
            setOpen(false);
          }
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

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <Drawer
        variant={isMdUp ? "permanent" : "temporary"}
        open={open}
        onClose={() => setOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: open ? (collapsed ? collapsedWidth : drawerWidth) : 0,
          flexShrink: 0,
          transition: t =>
            t.transitions.create(["width"], {
              duration: t.transitions.duration.standard,
            }),
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
          },
        }}
        PaperProps={{
          sx: {
            width: open ? (collapsed ? collapsedWidth : drawerWidth) : 0,
            transition: t =>
              t.transitions.create(["width"], {
                duration: t.transitions.duration.standard,
              }),
            overflow: "visible",
            // make Paper the positioning context for absolutely positioned children
            position: "relative",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            px: 1,
          }}
        >
          <AppBrand collapsed={collapsed} />
        </Box>
        <Divider />
        <List
          sx={{
            width: open ? (collapsed ? collapsedWidth : drawerWidth) : 0,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            overflow: "hidden",
            overflowY: "auto",
            gap: 0,
            marginBottom: 0,
            py: 1,
          }}
        >
          {NAVIGATION.map((item, index) => renderNavItem(item, index))}
        </List>
        {/* collapse toggle positioned relative to Drawer Paper so it can sit near the bottom */}
        {isMdUp && (
          <IconButton
            onClick={handleToggle}
            size="small"
            aria-label="Toggle sidebar"
            disableRipple
            sx={{
              position: "absolute",
              right: -14,
              bottom: 18,
              zIndex: t => t.zIndex.drawer + 2,
              width: 28,
              height: 28,
              p: 0.5,
              minWidth: 0,
              borderRadius: "999px",
              boxShadow: t => t.shadows[2],
              bgcolor: t => t.palette.background.paper,
              border: t => `1px solid ${t.palette.divider}`,
              "&:hover": {
                bgcolor: t => t.palette.background.paper,
                opacity: 1,
              },
            }}
          >
            <ChevronLeft
              sx={{
                transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
                transition: t =>
                  t.transitions.create("transform", {
                    duration: t.transitions.duration.shorter,
                  }),
              }}
            />
          </IconButton>
        )}
      </Drawer>

      <Divider orientation="vertical" />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          maxHeight: "100%",
          overflow: "auto",
          transition: t =>
            t.transitions.create(["margin", "width"], {
              duration: t.transitions.duration.standard,
            }),
        }}
      >
        <Box sx={{ maxHeight: "100vh", height: "100vh", overflow: "hidden" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
