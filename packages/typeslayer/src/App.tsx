import { ChevronLeft } from "@mui/icons-material";
import {
	Divider,
	List,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	Stack,
	Typography,
} from "@mui/material";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import tsLogo from "./assets/ts.png";
import tsNightmareLogo from "./assets/ts-nightmare.png";
import typeslayerLogo from "./assets/typeslayer.png";
import typeslayerNightmareLogo from "./assets/typeslayer-nightmare.png";
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

	// keep open state in sync with screen size
	useEffect(() => {
		setOpen(isMdUp);
	}, [isMdUp]);

	const activePath = location.pathname;

	const handleToggle = () => {
		// on md+ allow collapsing (show icons only)
		if (isMdUp) {
			setCollapsed((c) => !c);
		} else {
			setOpen((o) => !o);
		}
	};

	const renderNavItem = (item: (typeof NAVIGATION)[number]) => {
		if (item.kind === "header") {
			// hide group headers when the sidebar is collapsed (show icons only)
			if (collapsed) {
				return null;
			}
			return (
				<Typography
					key={item.title}
					sx={{ px: 2, pt: 2, pb: 1 }}
					variant="caption"
					color="text.secondary"
				>
					{item.title}
				</Typography>
			);
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
					px: collapsed ? 1 : 2,
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
			</Drawer>

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
				<Box sx={{ maxHeight: "100vh", height: "100%" }}>
					<Outlet />
				</Box>
			</Box>
		</Box>
	);
}
