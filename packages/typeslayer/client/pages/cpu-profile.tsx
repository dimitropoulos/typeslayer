import { ShowFile } from "../components/show-file";

export const CpuProfile = () => {
	return (
		<ShowFile
			fileName="tsc.cpuprofile"
			title="tsc.cpuprofile"
			description="This is the tsc.cpuprofile file created by the `--generateCpuProfile` tsc option."
		/>
	);
};
