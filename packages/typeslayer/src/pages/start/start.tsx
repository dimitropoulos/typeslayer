import { Stack } from "@mui/material";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import typeslayerLogo from "../../assets/typeslayer.png";
import typeslayerNightmareLogo from "../../assets/typeslayer-nightmare.png";
import { Step0Prerequisites } from "./step-0-prerequisites";
import { Step1PackageJson } from "./step-1-packagejson";
import { Step2Tsconfig } from "./step-2-tsconfig";
import { Step3Diagnostics } from "./step-3-diagnostics";

export function Start() {
  const [isFading, setIsFading] = useState(false);
  const [fadePhase, setFadePhase] = useState<0 | 1 | 2>(0);

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
        minHeight: "100%",
      }}
    >
      <Stack gap={3}>
        <Stack direction="row" spacing={2}>
          <Typography variant="h2">Start</Typography>
        </Stack>
        <Step0Prerequisites />
        <Step1PackageJson />
        <Step2Tsconfig />
        <Step3Diagnostics
          setFadePhase={setFadePhase}
          setIsFading={setIsFading}
        />
      </Stack>

      <Box
        sx={{
          position: "absolute",
          inset: 0,
          bgcolor: "black",
          opacity: isFading ? 1 : 0,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: t =>
            t.transitions.create("opacity", {
              duration: 1000,
              easing: t.transitions.easing.easeInOut,
            }),
          zIndex: t => t.zIndex.modal + 1,
        }}
      >
        <Box sx={{ position: "relative", width: "880px", height: "320px" }}>
          <img
            src={typeslayerLogo}
            alt="TypeSlayer"
            style={{
              position: "absolute",
              inset: 0,
              margin: "auto",
              width: "100%",
              height: "100%",
              objectFit: "contain",
              transition: "opacity 250ms ease-in",
            }}
          />
          <img
            src={typeslayerNightmareLogo}
            alt="TypeSlayer Nightmare"
            style={{
              position: "absolute",
              inset: 0,
              margin: "auto",
              width: "100%",
              height: "100%",
              paddingTop: "14px",
              objectFit: "contain",
              opacity: fadePhase === 2 ? 1 : 0,
              transition: "opacity 1000ms ease-in-out",
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
