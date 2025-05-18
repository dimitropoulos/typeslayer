import { ShowFile } from "../components/show-file";

export const AnalyzeTrace = () => {
	return (
		<ShowFile
			fileName="tsc.cpuprofile"
			title="tsc.cpuprofile"
			description="This is the output of the @typescript/analyze-trace tool"
		/>
	);
};
