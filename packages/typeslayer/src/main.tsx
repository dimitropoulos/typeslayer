import CssBaseline from "@mui/material/CssBaseline";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as R from "ramda";
import * as RA from "ramda-adjunct";
import ReactDOM from "react-dom/client";
import { AppRouterProvider } from "./routes";

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

const root = document.getElementById("root");
if (!root) {
	throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(
	<QueryClientProvider client={queryClient}>
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<AppRouterProvider />
		</ThemeProvider>
	</QueryClientProvider>,
);
