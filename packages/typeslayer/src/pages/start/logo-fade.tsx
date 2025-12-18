import { Box } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import typeslayerLogo from "../../assets/typeslayer.png";
import typeslayerNightmareLogo from "../../assets/typeslayer-nightmare.png";
import { useTypeGraphNodesAndLinks } from "../../hooks/tauri-hooks";

const phase = {
  clear: 0,
  fadeToBlack: 1,
  firstLogoIn: 2,
  secondLogoIn: 3,
} as const;

const timeTo = {
  startFirstLogo: 500,
  startSecondLogo: 1000,

  transitionOpacity: 1000,
  transitionFirstLogo: 500,
  transitionNightmare: 1500,
};

const imgSx = {
  position: "absolute",
  inset: 0,
  margin: "auto",
  width: "100%",
  height: "100%",
  objectFit: "contain",
} as const;

export const LogoFade = () => {
  const navigate = useNavigate();
  const { refetch: refetchTypeGraphNodesAndLinks } =
    useTypeGraphNodesAndLinks();

  const [fadePhase, setFadePhase] = useState<
    (typeof phase)[keyof typeof phase]
  >(phase.clear);

  useEffect(() => {
    console.log("starting logo fade", Date.now());
    setFadePhase(phase.fadeToBlack);

    const timeoutFirstLogoIn = setTimeout(() => {
      setFadePhase(phase.firstLogoIn);
    }, timeTo.startFirstLogo);

    const timeoutSecondLogoIn = setTimeout(() => {
      setFadePhase(phase.secondLogoIn);
      refetchTypeGraphNodesAndLinks()
        .then(() => {
          navigate({
            to: "/type-graph",
          });
        })
        .catch(err => {
          console.error("error refetching type graph nodes and links", err);
        });
    }, timeTo.startSecondLogo);

    return () => {
      clearTimeout(timeoutFirstLogoIn);
      clearTimeout(timeoutSecondLogoIn);
    };
  }, [navigate, refetchTypeGraphNodesAndLinks]);

  return (
    <Box
      sx={{
        position: "fixed",
        height: "100vh",
        width: "100vw",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        inset: 0,
        opacity: fadePhase > phase.clear ? 1 : 0,
        bgcolor: "black",
        pointerEvents: "none",
        display: "flex",
        transition: `opacity ${timeTo.transitionOpacity}ms ease-in`,
        zIndex: t => t.zIndex.modal + 1,
      }}
    >
      <Box sx={{ position: "relative", width: "880px", height: "320px" }}>
        <img
          src={typeslayerLogo}
          alt="TypeSlayer"
          style={{
            ...imgSx,
            opacity: fadePhase >= phase.firstLogoIn ? 1 : 0,
            transition: `opacity ${timeTo.transitionFirstLogo}ms ease-in`,
          }}
        />
        <img
          src={typeslayerNightmareLogo}
          alt="TypeSlayer Nightmare"
          style={{
            ...imgSx,
            paddingTop: "14px",
            opacity: fadePhase >= phase.secondLogoIn ? 1 : 0,
            transition: `opacity ${timeTo.transitionNightmare}ms ease-in`,
          }}
        />
      </Box>
    </Box>
  );
};
