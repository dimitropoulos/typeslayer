import { CPU_PROFILE_FILENAME } from "@typeslayer/validate";
import { ShowFile } from "../components/show-file";

export const CpuProfile = () => {
	return (
		<ShowFile
			fileName={CPU_PROFILE_FILENAME}
			title={CPU_PROFILE_FILENAME}
			description="This is the CPU Profile file created by the `--generateCpuProfile` tsc option."
		/>
	);
};
