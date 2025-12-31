import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { App } from "./App";
import { AnalyzeTraceFail } from "./pages/events/analyze-trace-fail";
import { AnalyzeTraceSuccess } from "./pages/events/analyze-trace-success";
import { AppStartedFail } from "./pages/events/app-started-fail";
import { AppStartedSuccess } from "./pages/events/app-started-success";
import { GenerateTraceFail } from "./pages/events/generate-trace-fail";
import { GenerateTraceSuccess } from "./pages/events/generate-trace-success";
import { TypeGraphFail } from "./pages/events/type-graph-fail";
import { TypeGraphSuccess } from "./pages/events/type-graph-success";
import { ExploreAppStartedPage } from "./pages/explore/app-started/app-started";
import { ExploreGenerateTracePage } from "./pages/explore/generate-trace";

// Root route – renders App which contains DashboardLayout and Outlet
const rootRoute = createRootRoute({
  component: App,
});

// Event type routes
const appStartedSuccessDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/events/app_started_success/$id",
  component: AppStartedSuccess,
});

const appStartedFailDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/events/app_started_fail/$id",
  component: AppStartedFail,
});

const generateTraceSuccessDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/events/generate_trace_success/$id",
  component: GenerateTraceSuccess,
});

const generateTraceFailDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/events/generate_trace_fail/$id",
  component: GenerateTraceFail,
});

const analyzeTraceSuccessDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/events/analyze_trace_success/$id",
  component: AnalyzeTraceSuccess,
});

const analyzeTraceFailDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/events/analyze_trace_fail/$id",
  component: AnalyzeTraceFail,
});

const typeGraphSuccessDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/events/type_graph_success/$id",
  component: TypeGraphSuccess,
});

const typeGraphFailDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/events/type_graph_fail/$id",
  component: TypeGraphFail,
});

const exploreAppStartedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/explore/app-started",
  component: ExploreAppStartedPage,
});

const exploreGenerateTraceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/explore/generate-trace",
  component: ExploreGenerateTracePage,
});

// Index redirect to /events
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => {
    if (typeof window !== "undefined") {
      window.location.pathname = "/events/app_started_success";
    }
    return null;
  },
});

// Create route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  appStartedSuccessDetailRoute,
  appStartedFailDetailRoute,
  generateTraceSuccessDetailRoute,
  generateTraceFailDetailRoute,
  analyzeTraceSuccessDetailRoute,
  analyzeTraceFailDetailRoute,
  typeGraphSuccessDetailRoute,
  typeGraphFailDetailRoute,
  exploreAppStartedRoute,
  exploreGenerateTraceRoute,
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
