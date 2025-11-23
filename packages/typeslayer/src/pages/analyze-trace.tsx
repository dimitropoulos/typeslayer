import { ShowFile } from "../components/show-file";

export const AnalyzeTrace = () => {
	return (
		<ShowFile
			fileName="analyze-trace.json"
			title="analyze-trace.json"
			description="This is the raw output from a custom tool that analyzes the trace looking for hot spots, based on @typescript/analyze-trace."
		/>
	);
};
