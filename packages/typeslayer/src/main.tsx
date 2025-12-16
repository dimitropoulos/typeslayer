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
import { ToastProvider } from "./contexts/toast-context";
import { theme } from "./theme";

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
    <ThemeProvider theme={theme}>
      <ToastProvider>
        <CssBaseline />
        <AppRouterProvider />
      </ToastProvider>
    </ThemeProvider>
    {/* <ReactQueryDevtools initialIsOpen={false} /> */}
  </QueryClientProvider>,
);
