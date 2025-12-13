import { TRACE_JSON_FILENAME } from "@typeslayer/validate";
import { useEffect, useRef } from "react";
import { useStaticFile } from "../hooks/tauri-hooks";

export const Perfetto = () => {
  const { data, isLoading } = useStaticFile(TRACE_JSON_FILENAME);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-load trace when data is available
  useEffect(() => {
    if (data && iframeRef.current) {
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
        if (event.source !== perfettoWindow) {
          return;
        }
        if (event.data !== "PONG") {
          return;
        }

        clearInterval(interval);
        window.removeEventListener("message", handleMessage);

        perfettoWindow.postMessage(
          {
            perfetto: {
              buffer,
              title: TRACE_JSON_FILENAME,
            },
          },
          "*",
        );
      };

      window.addEventListener("message", handleMessage);
    }
  }, [data, isLoading]);

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
