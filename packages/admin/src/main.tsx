/// <reference types="@cloudflare/workers-types" />

import CssBaseline from "@mui/material/CssBaseline";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import ReactDOM from "react-dom/client";
import { AppRouterProvider } from "./routes";

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { ThemeProvider } from "@mui/material";
import { muiTheme } from "@typeslayer/common";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't refetch on window focus in desktop app
      refetchOnWindowFocus: false,
      // we're not over the internet so no reason to retry
      retry: 0,
      // Cache data for 5 minutes
      staleTime: 1000 * 60 * 5,
      // Keep data in cache for 10 minutes
      gcTime: 1000 * 60 * 10,
    },
    mutations: {
      // we're not over the internet so no reason to retry
      retry: 0,
    },
  },
});

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <AppRouterProvider />
    </ThemeProvider>
    {/* <ReactQueryDevtools initialIsOpen={false} /> */}
  </QueryClientProvider>,
);
