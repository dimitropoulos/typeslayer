import { CPU_PROFILE_FILENAME } from "@typeslayer/validate";
import { useMemo, useRef } from "react";
import { serverBaseUrl } from "../components/utils";

export const SpeedScope = () => {
	const iframeRef = useRef<HTMLIFrameElement | null>(null);
	const profileUrl = useMemo(
		() => `${serverBaseUrl}/outputs/${CPU_PROFILE_FILENAME}`,
		[],
	);

	const embeddedUrl = useMemo(() => {
		const isHttpLike =
			typeof window !== "undefined" &&
			window.location.protocol.startsWith("http");
		// When not served over http(s) (e.g., tauri://), use hosted speedscope to allow profileURL loading
		if (!isHttpLike) {
			return `https://www.speedscope.app/#profileURL=${encodeURIComponent(profileUrl)}`;
		}
		// In dev/http, use the bundled local copy
		return `/speedscope-ui/index.html#profileURL=${encodeURIComponent(profileUrl)}`;
	}, [profileUrl]);

	if (!profileUrl) {
		return <div>Loading CPU profile...</div>;
	}

	return (
		<iframe
			ref={iframeRef}
			title="speedscope"
			src={embeddedUrl}
			style={{ width: "100%", height: "100%", border: "none" }}
		/>
	);
};
