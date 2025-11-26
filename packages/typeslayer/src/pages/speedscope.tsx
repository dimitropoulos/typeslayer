import { CPU_PROFILE_FILENAME } from "@typeslayer/validate";
import { useEffect, useMemo, useRef } from "react";
import { SERVER_PORT } from "../components/constants";

export const SpeedScope = () => {
	const iframeRef = useRef<HTMLIFrameElement | null>(null);

	const profileUrl = useMemo(
		() => `http://localhost:${SERVER_PORT}/static/${CPU_PROFILE_FILENAME}`,
		[],
	);
	const embeddedUrl = useMemo(
		() =>
			`/speedscope-ui/index.html#profileURL=${encodeURIComponent(profileUrl)}`,
		[profileUrl],
	);

	// Auto-load the embedded SpeedScope on mount
	useEffect(() => {
		if (iframeRef.current) {
			iframeRef.current.src = embeddedUrl;
		}
	}, [embeddedUrl]);

	return (
		<iframe
			ref={iframeRef}
			title="speedscope"
			src={embeddedUrl}
			style={{ width: "100%", height: "100%", border: "none" }}
		/>
	);
};
