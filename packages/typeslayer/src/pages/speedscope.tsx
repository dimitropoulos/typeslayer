import { CPU_PROFILE_FILENAME } from "@typeslayer/validate";
import { useEffect, useMemo, useRef } from "react";

export const SpeedScope = () => {
	const iframeRef = useRef<HTMLIFrameElement | null>(null);

	const profileURL = useMemo(() => `/tmp-files/${CPU_PROFILE_FILENAME}`, []);
	const embeddedUrl = useMemo(
		() =>
			`/speedscope-ui/index.html#profileURL=${encodeURIComponent(profileURL)}`,
		[profileURL],
	);

	// Auto-load the embedded SpeedScope on mount or when blobUrl updates
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
