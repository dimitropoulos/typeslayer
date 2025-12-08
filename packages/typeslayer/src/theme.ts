import type { Theme } from "@mui/material";
import { createTheme } from "@mui/material";

const black = "#000000";
const white = "#FFFFFF";

const doomRed = {
  main: "#C02929",
  light: "#D33030",
  dark: "#9F1E1E",
  darker: "#5E1212",
  contrastText: "#F8F8F8",
};

const doomYellow = {
  main: "#E3B341",
  light: "#F7C94D",
  dark: "#9E7A1F",
  contrastText: "#1A1A1A",
};

const darkBg = {
  0: "#0F0F11",
  1: "#141416",
  2: "#1C1C1F",
  3: "#252529",
  4: "#2E2E33",
  5: "#38383E",
};

const text = {
  primary: "#EAEAEA",
  secondary: "#B4B4B8",
  disabled: "#6A6A6F",
};

const error = {
  main: "#D34F4F",
  dark: "#8A2F2F",
  light: "#F07A7A",
  contrastText: "#1A1A1A",
};

const success = {
  main: "#3E9250",
  dark: "#1D4F29",
  light: "#55B76A",
  contrastText: "#101010",
};

const divider = "#2F2F33";
const border = {
  subtle: `${white}08`,
  subtleHover: `${white}1F`,
  subtleHoverActive: `${white}3D`,
  glass: `${white}12`,
};

declare module "@mui/material/styles" {
  interface Theme {
    custom: {
      gradients: {
        appBackground: string;
        primarySheen: string;
        insetPanel: string;
        dangerGlow: string;
      };
      glass: {
        light: string;
        deep: string;
      };
      border: {
        subtle: string;
        strong: string;
      };
      sidebar: {
        overlay: string; // gradient overlay for darkening & blending
      };
    };
  }
  interface ThemeOptions {
    custom?: Theme["custom"];
  }
}

export const theme: Theme = createTheme({
  palette: {
    mode: "dark",
    primary: doomRed,
    secondary: doomYellow,
    background: {
      default: darkBg[0],
      paper: darkBg[2],
    },
    text,
    error,
    warning: {
      main: doomYellow.main,
      contrastText: doomYellow.contrastText,
    },
    success,
    divider,
  },
  shape: {
    borderRadius: 0,
  },
  typography: {
    fontFamily: [
      "InterVariable",
      "Inter",
      "system-ui",
      "Segoe UI",
      "Ubuntu",
      "Roboto",
      "sans-serif",
    ].join(","),
    h1: { fontSize: "2.4rem", fontWeight: 700 },
    h2: { fontSize: "1.9rem", fontWeight: 650 },
    h3: { fontSize: "1.6rem", fontWeight: 600 },
    h4: { fontSize: "1.35rem", fontWeight: 600 },
    h5: { fontSize: "1.15rem", fontWeight: 600 },
    h6: { fontSize: "1rem", fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: 0.3 },
    subtitle2: { fontWeight: 500 },
  },
  shadows: [
    `none`,
    `0 2px 4px -2px ${black}80`,
    `0 3px 6px -2px ${black}8C`,
    `0 4px 12px -3px ${black}99`,
    `0 6px 18px -4px ${black}99`,
    `0 0 0 1px ${white}0A, 0 4px 24px -4px ${black}99`,
    `0 0 0 1px ${white}0A, 0 6px 26px -6px ${black}A6`,
    `0 0 0 1px ${white}0B, 0 8px 30px -6px ${black}B3`,
    `0 0 0 1px ${white}0B, 0 10px 34px -8px ${black}B8`,
    `0 0 0 1px ${white}0B, 0 12px 38px -10px ${black}C0`,
    `0 0 0 1px ${white}0B, 0 14px 42px -12px ${black}C7`,
    `0 0 0 1px ${white}0B, 0 16px 46px -14px ${black}CC`,
    `0 0 0 1px ${white}0B, 0 18px 50px -16px ${black}D1`,
    `0 0 0 1px ${white}0B, 0 20px 54px -18px ${black}D6`,
    `0 0 0 1px ${white}0B, 0 22px 58px -20px ${black}DB`,
    `0 0 0 1px ${white}0B, 0 24px 62px -22px ${black}E0`,
    `0 0 0 1px ${white}0B, 0 26px 66px -24px ${black}E6`,
    `0 0 0 1px ${white}0F, 0 28px 70px -26px ${black}EB`,
    `0 0 0 1px ${white}0F, 0 30px 74px -28px ${black}F0`,
    `0 0 0 1px ${white}0F, 0 32px 78px -30px ${black}F5`,
    `0 0 0 1px ${white}0F, 0 34px 82px -32px ${black}F7`,
    `0 0 0 1px ${white}12, 0 36px 86px -34px ${black}FB`,
    `0 0 0 1px ${white}12, 0 38px 90px -36px ${black}FD`,
    `0 0 0 1px ${white}12, 0 40px 94px -38px ${black}FF`,
    `0 0 0 1px ${white}12, 0 42px 98px -40px ${black}FF`,
  ],
  components: {
    MuiAccordion: {
      styleOverrides: {
        root: {
          border: `1px solid ${divider}`,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      },
    },
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          // Fix Tauri zoom scaling issues by using explicit dimensions instead of font-size
          width: "1em",
          height: "1em",
        },
        fontSizeSmall: {
          width: "1.125rem",
          height: "1.125rem",
        },
        fontSizeMedium: {
          width: "1.25rem",
          height: "1.25rem",
        },
        fontSizeLarge: {
          width: "2rem",
          height: "2rem",
        },
        fontSizeInherit: {
          // MuiAlert icons
          width: "1.5rem",
          height: "1.5rem",
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          // Ensure list icons provide a consistent box for SVGs to fill
          minWidth: 32,
          height: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        "@global": {
          "@font-face": [
            // Inter variable optional placeholder - assume project includes it or fallback.
          ],
        },
        body: {
          background: black,
          backgroundImage: `radial-gradient(circle at 30% 20%, ${doomRed.main}1A, transparent 50%), radial-gradient(circle at 85% 70%, ${doomYellow.main}20, transparent 60%)`,
          minHeight: "100vh",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
        "*::-webkit-scrollbar": {
          width: 12,
          height: 8,
        },
        "*::-webkit-scrollbar-track": {
          background: border.subtle,
        },
        "*::-webkit-scrollbar-thumb": {
          background: `linear-gradient(180deg, ${doomRed.darker}, ${doomRed.dark})`,
          border: `1px solid ${black}99`,
        },
        // Hide number input spinner buttons
        "input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button":
          {
            WebkitAppearance: "none",
            margin: 0,
          },
        "input[type=number]": {
          MozAppearance: "textfield",
        },
      },
    },
    MuiFormControl: {
      defaultProps: {
        variant: "standard",
      },
    },
    MuiInputLabel: {
      defaultProps: {
        shrink: true,
      },
      styleOverrides: {
        root: {
          position: "relative",
          transform: "none",
          fontSize: "0.875rem",
          fontWeight: 600,
          color: text.secondary,
          marginBottom: "8px",
          "&.Mui-focused": {
            color: doomRed.light,
          },
        },
      },
    },
    MuiInput: {
      styleOverrides: {
        root: {
          marginTop: "0 !important",
          "&::before": {
            borderBottom: `1px solid ${border.subtleHover}`,
          },
          "&:hover:not(.Mui-disabled):before": {
            borderBottom: `1px solid ${border.subtleHoverActive}`,
          },
          "&.Mui-focused:after": {
            borderBottomColor: doomRed.main,
          },
        },
        input: {
          padding: "8px 0",
          fontSize: "0.95rem",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "standard",
        InputLabelProps: {
          shrink: true,
        },
      },
    },
    MuiSelect: {
      defaultProps: {
        variant: "standard",
        displayEmpty: true,
      },
      styleOverrides: {
        root: {
          "& .MuiSelect-icon": {
            top: 0,
            bottom: 0,
            right: 0,
            alignSelf: "center",
          },
        },
        select: {
          padding: "8px 48px 8px 12px !important",
          fontSize: "0.95rem",
          backgroundColor: `${black}4D`,
          borderRadius: "4px",
          border: `1px solid ${border.subtleHover}`,
          "&:hover": {
            backgroundColor: `${black}66`,
            borderColor: border.subtleHoverActive,
          },
          "&.Mui-focused": {
            backgroundColor: `${black}66`,
            borderColor: doomRed.main,
          },
        },
        iconStandard: {
          right: "6px",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
        rounded: {
          backdropFilter: "blur(12px)",
          background: `linear-gradient(145deg, ${white}0F 0%, ${black}73 100%)`,
          border: `1px solid ${border.glass}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: black,
          borderRight: `1px solid ${border.glass}`,

          boxShadow: `inset 0 0 0 1px ${black}0C, 0 8px 28px -6px ${black}B3`,
        },
      },
    },
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          backgroundImage: `linear-gradient(120deg, ${doomRed.dark}E6, ${doomRed.darker}E6)`,
          color: doomRed.contrastText,
          boxShadow: `0 0 0 1px ${border.glass}, 0 4px 12px -3px ${black}99`,
          transition: "background 150ms, transform 120ms",
          "&:hover": {
            backgroundImage: `linear-gradient(120deg, ${doomRed.main}FF, ${doomRed.darker}FF)`,
          },
        },
        outlined: {
          background: "transparent",
          boxShadow: "none",
          border: `1px solid ${doomRed.main}`,
          "&:hover": {
            background: `${doomRed.main}26`,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 1,
          backdropFilter: "blur(6px)",
          background: `linear-gradient(140deg, ${doomRed.dark}59, ${doomRed.dark}26)`,
          border: `1px solid ${border.glass}`,
          gap: 5,
        },
        labelSmall: {
          paddingLeft: 4,
          paddingRight: 4,
        },
        label: {
          alignSelf: "baseline",
        },
      },
    },
    MuiList: {
      styleOverrides: {
        root: {
          backgroundColor: black,
          padding: 0,
        },
      },
    },
    MuiListSubheader: {
      styleOverrides: {
        root: {
          padding: 0,
          paddingTop: 6,
          paddingBottom: 2,
          paddingLeft: 16,
          fontSize: "12px",
          letterSpacing: 1,
          textTransform: "uppercase",
          fontWeight: 700,
          lineHeight: "32px",
          color: doomYellow.light,
          background: black,
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: doomRed.main,
          textDecorationColor: doomRed.light,
          fontWeight: 600,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          marginLeft: 8,
          marginRight: 8,
          borderRadius: 0,
          borderColor: "transparent",
          borderWidth: 1,
          borderStyle: "solid",
          "&.Mui-selected": {
            borderColor: doomRed.main,
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backdropFilter: "blur(8px)",
          background: `linear-gradient(160deg, ${doomRed.dark}80, ${doomRed.darker}80)`,
          border: `1px solid ${border.subtleHover}`,
          fontSize: "0.9rem",
        },
      },
    },
  },
});
