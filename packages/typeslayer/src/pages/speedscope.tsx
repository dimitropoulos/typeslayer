import { CPU_PROFILE_FILENAME } from "@typeslayer/validate";
import { useEffect, useMemo, useRef, useState } from "react";
import { serverBaseUrl } from "../components/utils";

export const SpeedScope = () => {
	const iframeRef = useRef<HTMLIFrameElement | null>(null);
	const [blobUrl, setBlobUrl] = useState<string | null>(null);

	// Fetch the profile and create a blob URL
	useEffect(() => {
		let mounted = true;
		let url: string | null = null;
		(async () => {
			try {
				const response = await fetch(`${serverBaseUrl}/outputs/${CPU_PROFILE_FILENAME}`);
				if (!response.ok) {
					console.error("Failed to fetch CPU profile:", response.statusText);
					return;
				}
				const blob = await response.blob();
				url = URL.createObjectURL(blob);
				if (mounted) {
					setBlobUrl(url);
				}
			} catch (error) {
				console.error("Error loading CPU profile:", error);
			}
		})();
		return () => {
			mounted = false;
			if (url) {
				URL.revokeObjectURL(url);
			}
		};
	}, []);

	const embeddedUrl = useMemo(
		() => blobUrl ? `/speedscope-ui/index.html#profileURL=${encodeURIComponent(blobUrl)}` : null,
		[blobUrl],
	);

	// Auto-load the embedded SpeedScope when blobUrl is ready
	useEffect(() => {
		if (iframeRef.current && embeddedUrl) {
			iframeRef.current.src = embeddedUrl;
		}
	}, [embeddedUrl]);

	if (!embeddedUrl) {
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
