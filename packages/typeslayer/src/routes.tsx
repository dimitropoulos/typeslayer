import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { App } from "./App";
import { AboutPage } from "./pages/about";
import { AwardWinners } from "./pages/award-winners/award-winners";
import { CiCdIntegration } from "./pages/cicd-integration";
import { DocsPage } from "./pages/docs";
import { Mcp } from "./pages/mcp";
import { Perfetto } from "./pages/perfetto";
// analyze-trace page remains but is no longer directly routed
import { RawData } from "./pages/raw-data";
import { SearchTypes } from "./pages/search";
import { SettingsPage } from "./pages/settings";
import { SpeedScope } from "./pages/speedscope";
import { Start } from "./pages/start/start";
import { Treemap } from "./pages/treemap";
import { TypeGraph } from "./pages/type-graph";

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
  path: "/search",
  component: SearchTypes,
});

const searchTypesChildRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search/$typeId",
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

const TypeGraphRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/type-graph",
  component: TypeGraph,
});

const TypeGraphChildRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/type-graph/$typeId",
  component: TypeGraph,
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

const mcpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mcp/$tab",
  component: Mcp,
});

const cicdIntegrationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cicd-integration",
  component: CiCdIntegration,
});

const docsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/docs",
  component: DocsPage,
});

const docsChildRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/docs/$docId",
  component: DocsPage,
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: AboutPage,
});

// Index redirect to Award Winners (Largest Union)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => {
    // Redirect to /start on mount
    if (typeof window !== "undefined") {
      window.location.pathname = "/start";
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
  TypeGraphRoute,
  TypeGraphChildRoute,
  treemapRoute,
  perfettoRoute,
  speedscopeRoute,
  rawDataRoute,
  rawDataChildRoute,
  mcpRoute,
  cicdIntegrationsRoute,
  settingsRoute,
  docsRoute,
  docsChildRoute,
  aboutRoute,
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
