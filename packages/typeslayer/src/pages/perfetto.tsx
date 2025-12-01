import { useCallback, useEffect, useRef } from "react";
import { useStaticFile } from "../components/utils";

export const Perfetto = () => {
	const { data, isLoading } = useStaticFile("trace.json");
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const sendTraceToPerfetto = useCallback(() => {
		if (isLoading || !data || !iframeRef.current?.contentWindow) {
			console.error("No trace data or iframe not ready.");
			return;
		}

		const buffer = new TextEncoder().encode(data).buffer;
		const perfettoWindow = iframeRef.current.contentWindow;

		// Wait for iframe to be ready via PING/PONG
		const interval = setInterval(() => {
			perfettoWindow.postMessage("PING", "*");
		}, 100);

		const handleMessage = (event: MessageEvent) => {
			if (event.source !== perfettoWindow) return;
			if (event.data !== "PONG") return;

			clearInterval(interval);
			window.removeEventListener("message", handleMessage);

			perfettoWindow.postMessage(
				{
					perfetto: {
						buffer,
						title: "trace.json",
					},
				},
				"*",
			);
		};

		window.addEventListener("message", handleMessage);
	}, [data, isLoading]);

	// Auto-load trace when data is available
	useEffect(() => {
		if (data && iframeRef.current) {
			// Wait a bit for iframe to fully load
			const timer = setTimeout(sendTraceToPerfetto, 1000);
			return () => clearTimeout(timer);
		}
	}, [data, sendTraceToPerfetto]);
	return (
		<iframe
			ref={iframeRef}
			src="/perfetto-ui/index.html?hideSidebar=true"
			style={{
				width: "100%",
				height: "100vh",
				border: "none",
			}}
			title="Perfetto UI"
		/>
	);
};
