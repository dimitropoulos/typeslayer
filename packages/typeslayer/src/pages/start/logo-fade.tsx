import { Box } from "@mui/material";
import type { Register } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import typeslayerLogo from "../../assets/typeslayer.png";
import typeslayerNightmareLogo from "../../assets/typeslayer-nightmare.png";
import { useLogoFade } from "../../contexts/logo-fade-context";
import { useTypeGraphNodesAndLinks } from "../../hooks/tauri-hooks";

const phase = {
  clear: 0,
  fadeToBlack: 1,
  firstLogoIn: 2,
  secondLogoIn: 3,
} as const;

const timeTo = {
  startFirstLogo: 250,
  startSecondLogo: 750,

  transitionBackground: 500,
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

export const LogoFade = ({ router }: { router: Register["router"] }) => {
  const { refetch: refetchTypeGraphNodesAndLinks } =
    useTypeGraphNodesAndLinks();
  const { shouldShowLogoFade, setShouldShowLogoFade } = useLogoFade();

  const [fadePhase, setFadePhase] = useState<
    (typeof phase)[keyof typeof phase]
  >(phase.clear);

  console.log({ shouldShowLogoFade, fadePhase });

  useEffect(() => {
    if (!shouldShowLogoFade) {
      return;
    }

    setFadePhase(phase.fadeToBlack);

    const timeoutFirstLogoIn = setTimeout(() => {
      setFadePhase(phase.firstLogoIn);
    }, timeTo.startFirstLogo);

    let closingUp: NodeJS.Timeout;

    const timeoutSecondLogoIn = setTimeout(() => {
      setFadePhase(phase.secondLogoIn);
      console.log("navigating to /type-graph");
      const action = async () => {
        await refetchTypeGraphNodesAndLinks();
        await router.navigate({
          to: "/type-graph",
        });
      };

      action()
        .catch(err => {
          console.error("error refetching type graph nodes and links", err);
        })
        .finally(() => {
          setFadePhase(phase.clear);
          closingUp = setTimeout(() => {
            setShouldShowLogoFade(false);
          }, timeTo.transitionBackground);
        });
    }, timeTo.startSecondLogo);

    return () => {
      clearTimeout(timeoutFirstLogoIn);
      clearTimeout(timeoutSecondLogoIn);
      clearTimeout(closingUp);
    };
  }, [
    shouldShowLogoFade,
    router.navigate,
    refetchTypeGraphNodesAndLinks,
    setShouldShowLogoFade,
  ]);

  if (!shouldShowLogoFade) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        height: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        inset: 0,
        opacity: fadePhase >= phase.fadeToBlack ? 1 : 0,
        backgroundColor: "black",
        pointerEvents: "auto",
        transition: `opacity ${timeTo.transitionBackground}ms ease-in-out`,
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
            transition: `opacity ${timeTo.transitionFirstLogo}ms ease-in-out`,
          }}
        />
        <img
          src={typeslayerNightmareLogo}
          alt="TypeSlayer Nightmare"
          style={{
            ...imgSx,
            paddingTop: "14px",
            opacity: fadePhase >= phase.secondLogoIn ? 1 : 0,
            transition: `opacity ${timeTo.transitionNightmare}ms ease-in-out`,
          }}
        />
      </Box>
    </Box>
  );
};
