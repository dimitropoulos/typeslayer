import CssBaseline from "@mui/material/CssBaseline";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import * as R from "ramda";
import * as RA from "ramda-adjunct";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { trpc } from "./trpc";

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { ThemeProvider } from "@mui/material";
import type { TypeRegistry } from "@typeslayer/validate";
import { theme } from "./theme";

window.R = R;
window.RA = RA;

declare global {
	interface Window {
		typeRegistry: TypeRegistry;
		R: typeof R;
		RA: typeof RA;
	}
}

const queryClient = new QueryClient();

const trpcClient = trpc.createClient({
	links: [
		httpBatchLink({
			url: "http://localhost:3000/trpc",
		}),
	],
});

const root = document.getElementById("root");
if (!root) {
	throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(
	<trpc.Provider client={trpcClient} queryClient={queryClient}>
		<QueryClientProvider client={queryClient}>
			<ThemeProvider theme={theme}>
				<CssBaseline />
				<App />
			</ThemeProvider>
		</QueryClientProvider>
	</trpc.Provider>,
);
