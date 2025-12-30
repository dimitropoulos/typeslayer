import ChevronLeft from "@mui/icons-material/ChevronLeft";
import { Divider, List, Stack } from "@mui/material";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Outlet } from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import tsLogo from "./assets/ts.png";
import tsNightmareLogo from "./assets/ts-nightmare.png";
import typeslayerLogo from "./assets/typeslayer.png";
import typeslayerNightmareLogo from "./assets/typeslayer-nightmare.png";
import { AuthGate } from "./components/auth-gate";
import { NAVIGATION, RenderNavItem } from "./components/navigation";
import { useTaskProgressEvents } from "./hooks/tauri-hooks";

function AppBrand({
  collapsed,
  nightmare,
}: {
  collapsed?: boolean;
  nightmare?: boolean;
}) {
  return (
    <Stack direction="row" gap={2} alignItems="center" sx={{ p: 2 }}>
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
  const drawerWidth = 224;

  const collapsedWidth = 64;

  const [open, setOpen] = useState<boolean>(isMdUp);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  useTaskProgressEvents();

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
          {NAVIGATION.map((item, index) => (
            <RenderNavItem
              // biome-ignore lint/suspicious/noArrayIndexKey: the order never changes
              key={index}
              item={item}
              index={index}
              collapsed={collapsed}
            />
          ))}
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
