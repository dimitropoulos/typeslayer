import { CPU_PROFILE_FILENAME } from "@typeslayer/validate";
import { serverBaseUrl } from "../components/utils";

export const SpeedScope = () => {
  const profileUrl = `${serverBaseUrl}/outputs/${CPU_PROFILE_FILENAME}`;
  const embeddedUrl = `/speedscope-ui/index.html#profileURL=${encodeURIComponent(profileUrl)}`;
  return (
    <iframe
      title="speedscope"
      src={embeddedUrl}
      style={{ width: "100%", height: "100%", border: "none" }}
    />
  );
};
