import { CameraAlt, ChevronLeft } from "@mui/icons-material";
import {
	Divider,
	List,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	ListSubheader,
	Snackbar,
	Stack,
} from "@mui/material";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import dimitropoulosAvatar from "./assets/dimitropoulos.png";
import tsLogo from "./assets/ts.png";
import tsNightmareLogo from "./assets/ts-nightmare.png";
import typeslayerLogo from "./assets/typeslayer.png";
import typeslayerNightmareLogo from "./assets/typeslayer-nightmare.png";
import { AuthGate } from "./components/auth-gate";
import { NAVIGATION } from "./components/utils";

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
	const [screenshotSnackbar, setScreenshotSnackbar] = useState<{
		open: boolean;
		message: string;
	}>({ open: false, message: "" });

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
			setCollapsed((c) => !c);
		} else {
			setOpen((o) => !o);
		}
	};

	const handleScreenshot = async () => {
		try {
			const path = await invoke<string>("take_screenshot");
			setScreenshotSnackbar({
				open: true,
				message: `Screenshot saved to ${path} and copied to clipboard`,
			});
		} catch (error) {
			setScreenshotSnackbar({
				open: true,
				message: `Failed to take screenshot: ${error}`,
			});
		}
	};

	if (!authenticated) {
		return <AuthGate onAuthenticated={() => setAuthenticated(true)} />;
	}

	const renderNavItem = (item: (typeof NAVIGATION)[number]) => {
		if (item.kind === "header") {
			// hide group headers when the sidebar is collapsed (show icons only)
			if (collapsed) {
				return null;
			}
			return <ListSubheader key={item.title}>{item.title}</ListSubheader>;
		}
		if (item.kind === "divider") {
			return <Divider key={Math.random()} sx={{ my: 1 }} />;
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
				key={to}
				selected={selected}
				onClick={() => {
					navigate({ to });
					if (!isMdUp) setOpen(false);
				}}
				sx={{
					mb: 0.5,
					justifyContent: collapsed ? "center" : "flex-start",
					px: 1,
					transition: (theme) =>
						theme.transitions.create(["background-color", "padding"], {
							duration: 200,
						}),
				}}
			>
				<ListItemIcon
					sx={{ minWidth: collapsed ? 0 : 38, justifyContent: "center" }}
				>
					{item.icon}
				</ListItemIcon>
				{!collapsed && <ListItemText primary={item.title} />}
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
					transition: (t) =>
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
						transition: (t) =>
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
						p: 1,
						width: open ? (collapsed ? collapsedWidth : drawerWidth) : 0,
						overflowY: "auto",
					}}
				>
					{NAVIGATION.map((item) => renderNavItem(item))}
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
							bottom: 16,
							zIndex: (t) => t.zIndex.drawer + 2,
							width: 28,
							height: 28,
							p: 0.5,
							minWidth: 0,
							borderRadius: "999px",
							boxShadow: (t) => t.shadows[2],
							bgcolor: (t) => t.palette.background.paper,
							border: (t) => `1px solid ${t.palette.divider}`,
							"&:hover": {
								bgcolor: (t) => t.palette.background.paper,
								opacity: 1,
							},
						}}
					>
						<ChevronLeft />
					</IconButton>
				)}
				{/* Screenshot button */}
				<IconButton
					onClick={handleScreenshot}
					size="small"
					aria-label="Take screenshot"
					sx={{
						position: "absolute",
						bottom: 64,
						left: collapsed ? 8 : 12,
						right: collapsed ? 8 : 12,
						width: collapsed ? 48 : "auto",
						height: 40,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: 1,
						borderRadius: 1,
						bgcolor: (t) => t.palette.background.paper,
						border: (t) => `1px solid ${t.palette.divider}`,
						"&:hover": {
							bgcolor: (t) => t.palette.action.hover,
						},
					}}
				>
					<CameraAlt fontSize="small" />
					{!collapsed && <span style={{ fontSize: 14 }}>Screenshot</span>}
				</IconButton>
				<span style={{ flex: 1 }} />{" "}
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						gap: 1,
						borderTop: (t) => `1px solid ${t.palette.divider}`,
						px: 2,
						py: 2,
						color: "text.secondary",
					}}
				>
					<a
						href="https://github.com/dimitropoulos"
						target="_blank"
						rel="noreferrer"
						style={{
							display: "flex",
							alignItems: "center",
							gap: 8,
							textDecoration: "none",
							color: "inherit",
						}}
					>
						<img
							src={dimitropoulosAvatar}
							alt="dimitropoulos avatar"
							style={{ width: 23, height: 23 }}
						/>
						{!collapsed && <span>by&nbsp;dimitropoulos</span>}
					</a>
				</Box>
			</Drawer>

			<Divider orientation="vertical" />

			<Box
				component="main"
				sx={{
					flexGrow: 1,
					maxHeight: "100%",
					overflow: "auto",
					transition: (t) =>
						t.transitions.create(["margin", "width"], {
							duration: t.transitions.duration.standard,
						}),
				}}
			>
				<Box sx={{ maxHeight: "100vh", height: "100vh", overflow: "hidden" }}>
					<Outlet />
				</Box>
			</Box>
			<Snackbar
				open={screenshotSnackbar.open}
				autoHideDuration={4000}
				onClose={() => setScreenshotSnackbar({ open: false, message: "" })}
				message={screenshotSnackbar.message}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			/>
		</Box>
	);
}
