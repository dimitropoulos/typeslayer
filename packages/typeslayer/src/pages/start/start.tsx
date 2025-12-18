import { CircularProgress, Stack } from "@mui/material";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useCallback, useState } from "react";
import { useAllTaskProgress } from "../../hooks/tauri-hooks";
import { LogoFade } from "./logo-fade";
import { Step0Prerequisites } from "./step-0-prerequisites";
import { Step1PackageJson } from "./step-1-packagejson";
import { Step2Tsconfig } from "./step-2-tsconfig";
import { Step3Diagnostics } from "./step-3-diagnostics";

export function Start() {
  const [isComplete, setIsComplete] = useState(false);
  const onComplete = useCallback(() => {
    setIsComplete(true);
  }, []);

  return (
    <Box
      sx={{
        px: 4,
        overflowY: "auto",
        maxHeight: "100%",
        gap: 2,
        pb: 4,
        mt: 4,
        position: "relative",
        minHeight: "100vh",
      }}
    >
      {isComplete ? <LogoFade /> : null}
      <Stack sx={{ gap: 3, mb: 4 }}>
        <Typography variant="h2">Start</Typography>
        <Step0Prerequisites />
        <Step1PackageJson />
        <Step2Tsconfig />
        <Step3Diagnostics onComplete={onComplete} />
      </Stack>
    </Box>
  );
}

export const StartProgress = () => {
  const taskProgress = useAllTaskProgress();

  if (!taskProgress || taskProgress.length === 0) {
    return null;
  }

  return <CircularProgress enableTrackSlot size={20} />;
};
