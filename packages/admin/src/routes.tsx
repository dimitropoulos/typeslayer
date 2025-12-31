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

// Root route – renders App which contains DashboardLayout and Outlet
const rootRoute = createRootRoute({
  component: App,
});

// Event type routes
const appStartedSuccessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/events/app-started-success",
  component: AppStartedSuccess,
});

const appStartedFailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/events/app-started-fail",
  component: AppStartedFail,
});

const generateTraceSuccessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/events/generate-trace-success",
  component: GenerateTraceSuccess,
});

const generateTraceFailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/events/generate-trace-fail",
  component: GenerateTraceFail,
});

const analyzeTraceSuccessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/events/analyze-trace-success",
  component: AnalyzeTraceSuccess,
});

const analyzeTraceFailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/events/analyze-trace-fail",
  component: AnalyzeTraceFail,
});

const typeGraphSuccessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/events/type-graph-success",
  component: TypeGraphSuccess,
});

const typeGraphFailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/events/type-graph-fail",
  component: TypeGraphFail,
});

// Index redirect to /events
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => {
    if (typeof window !== "undefined") {
      window.location.pathname = "/events";
    }
    return null;
  },
});

// Create route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  appStartedSuccessRoute,
  appStartedFailRoute,
  generateTraceSuccessRoute,
  generateTraceFailRoute,
  analyzeTraceSuccessRoute,
  analyzeTraceFailRoute,
  typeGraphSuccessRoute,
  typeGraphFailRoute,
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
