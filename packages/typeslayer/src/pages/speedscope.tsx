import Box from "@mui/material/Box";
import { CPU_PROFILE_FILENAME } from "@typeslayer/validate";
import { CenterLoader } from "../components/center-loader";
import { NoData } from "../components/no-data";
import { serverBaseUrl } from "../components/utils";
import { useOutputFileSizes } from "../hooks/tauri-hooks";

export const SpeedScope = () => {
  const { data: fileSizes, isLoading } = useOutputFileSizes();
  if (isLoading) {
    <CenterLoader />;
  }

  if (!fileSizes || !(CPU_PROFILE_FILENAME in fileSizes)) {
    return (
      <Box sx={{ my: 2, mr: 2 }}>
        <NoData />
      </Box>
    );
  }

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
