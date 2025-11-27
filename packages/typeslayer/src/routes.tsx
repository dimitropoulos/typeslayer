import {
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { App } from "./App";
import { AwardWinners } from "./pages/award-winners";
import { Integrations } from "./pages/integrations";
import { Perfetto } from "./pages/perfetto";
// analyze-trace page remains but is no longer directly routed
import { RawData } from "./pages/raw-data";
import { SearchTypes } from "./pages/search-types";
import { SettingsPage } from "./pages/settings";
import { SpeedScope } from "./pages/speedscope";
import { Start } from "./pages/start";
import { Treemap } from "./pages/treemap";
import { TypeNetwork } from "./pages/type-network";

// Root route – renders App which contains DashboardLayout and Outlet
const rootRoute = createRootRoute({
	component: App,
});

// Define individual routes
const startRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/start",
	component: Start,
});

const startChildRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/start/$step",
	component: Start,
});

const searchTypesRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/search-types",
	component: SearchTypes,
});

const searchTypesChildRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/search-types/$typeId",
	component: SearchTypes,
});

const awardWinnersRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/award-winners",
	component: AwardWinners,
});

const awardWinnersChildRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/award-winners/$awardId",
	component: AwardWinners,
});

const typeNetworkRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/type-network",
	component: TypeNetwork,
});

const treemapRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/treemap",
	component: Treemap,
});

const perfettoRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/perfetto",
	component: Perfetto,
});

const speedscopeRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/speedscope",
	component: SpeedScope,
});

const rawDataRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/raw-data",
	component: RawData,
});

const rawDataChildRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/raw-data/$fileId",
	component: RawData,
});

const settingsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/settings",
	component: SettingsPage,
});

const integrationsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/integrations",
	component: Integrations,
});

// Index redirect to /type-network
const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: () => {
		// Redirect to /type-network on mount
		if (typeof window !== "undefined") {
			window.location.pathname = "/type-network";
		}
		return null;
	},
});

// Create route tree
const routeTree = rootRoute.addChildren([
	indexRoute,
	startRoute,
	startChildRoute,
	searchTypesRoute,
	searchTypesChildRoute,
	awardWinnersRoute,
	awardWinnersChildRoute,
	typeNetworkRoute,
	treemapRoute,
	perfettoRoute,
	speedscopeRoute,
	rawDataRoute,
	rawDataChildRoute,
	settingsRoute,
	integrationsRoute,
]);

// Create router instance
const router = createRouter({
	routeTree,
	defaultPreload: "intent",
});

// Export the router provider
export function AppRouterProvider() {
	return <RouterProvider router={router} />;
}

// Type augmentation for router
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
