/*
 * Doom (1993) inspired theme
 * Goals:
 *  - Modern & minimal (avoid native Material look: no default ripples, toned-down elevations)
 *  - Use Doom status bar / UI palette: deep red primary, warm yellow secondary
 *  - Tasteful gradients + subtle glass (blur) surfaces where it adds depth
 *  - Sidebar uses a cracked stone texture tile + dark overlay
 *  - Keep accessibility: ensure sufficient contrast for text & interactive states
 *
 * Palette reference (approximation of Doom EGA-like colors):
 *  Doom Red:    #9F1E1E (slightly desaturated so it isn't eye-fatiguing) / accent #C02929
 *  Doom Yellow: #E3B341 (warm amber) / accent #F7C94D
 *
 * We extend the theme with custom tokens under theme.custom for future use.
 */

import type { Theme } from "@mui/material";
import { createTheme } from "@mui/material";
import doomTexturePng from "./assets/doom-texture-116.png";

const doomRed = {
	main: "#C02929",
	light: "#d33030",
	dark: "#9F1E1E",
	contrastText: "#F8F8F8",
};

const doomYellow = {
	main: "#E3B341",
	light: "#F7C94D",
	dark: "#9E7A1F",
	contrastText: "#1A1A1A",
};

// Neutral greys (avoid stock Material greys for a custom feel)
const darkBg = {
	0: "#0F0F11",
	1: "#141416",
	2: "#1C1C1F",
	3: "#252529",
	4: "#2E2E33",
	5: "#38383E",
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
				texture: string; // local SVG cracked stone
				external: string; // external Doom texture PNG
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
		text: {
			primary: "#EAEAEA",
			secondary: "#B4B4B8",
			disabled: "#6A6A6F",
		},
		error: {
			main: "#D34F4F",
			dark: "#8A2F2F",
			light: "#F07A7A",
			contrastText: "#1A1A1A",
		},
		warning: {
			main: doomYellow.main,
			contrastText: doomYellow.contrastText,
		},
		success: {
			main: "#3E9250",
			dark: "#1D4F29",
			light: "#55B76A",
			contrastText: "#101010",
		},
		divider: "#2F2F33",
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
	custom: {
		gradients: {
			appBackground:
				"radial-gradient(circle at 30% 20%, rgba(159,30,30,0.15), transparent 60%), radial-gradient(circle at 85% 70%, rgba(227,179,65,0.15), transparent 60%), linear-gradient(135deg, #121214 0%, #1B1B1F 60%, #161618 100%)",
			primarySheen:
				"linear-gradient(145deg, rgba(192,41,41,0.6) 0%, rgba(159,30,30,0.3) 40%, rgba(94,18,18,0.25) 100%)",
			insetPanel:
				"linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 40%, rgba(0,0,0,0.35) 100%)",
			dangerGlow:
				"radial-gradient(circle at 50% 50%, rgba(211,79,79,0.35), rgba(159,30,30,0.05) 70%)",
		},
		glass: {
			light: "rgba(255,255,255,0.06)",
			deep: "rgba(0,0,0,0.45)",
		},
		border: {
			subtle: "1px solid rgba(255,255,255,0.06)",
			strong: "1px solid rgba(255,255,255,0.18)",
		},
		sidebar: {
			// Local textures: imported cracked stone + downloaded Doom UI texture (526.png)
			texture: `url(${doomTexturePng})`,
			external: `url(${doomTexturePng})`,
			overlay:
				"linear-gradient(180deg, rgba(20,20,22,0.92) 0%, rgba(20,20,22,0.78) 40%, rgba(20,20,22,0.95) 100%)",
		},
	},
	shadows: [
		"none",
		"0 2px 4px -2px rgba(0,0,0,0.5)",
		"0 3px 6px -2px rgba(0,0,0,0.55)",
		"0 4px 12px -3px rgba(0,0,0,0.6)",
		"0 6px 18px -4px rgba(0,0,0,0.6)",
		"0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px -4px rgba(0,0,0,0.6)",
		"0 0 0 1px rgba(255,255,255,0.04), 0 6px 26px -6px rgba(0,0,0,0.65)",
		"0 0 0 1px rgba(255,255,255,0.05), 0 8px 30px -6px rgba(0,0,0,0.7)",
		"0 0 0 1px rgba(255,255,255,0.05), 0 10px 34px -8px rgba(0,0,0,0.72)",
		"0 0 0 1px rgba(255,255,255,0.05), 0 12px 38px -10px rgba(0,0,0,0.75)",
		"0 0 0 1px rgba(255,255,255,0.05), 0 14px 42px -12px rgba(0,0,0,0.78)",
		"0 0 0 1px rgba(255,255,255,0.05), 0 16px 46px -14px rgba(0,0,0,0.8)",
		"0 0 0 1px rgba(255,255,255,0.05), 0 18px 50px -16px rgba(0,0,0,0.82)",
		"0 0 0 1px rgba(255,255,255,0.05), 0 20px 54px -18px rgba(0,0,0,0.84)",
		"0 0 0 1px rgba(255,255,255,0.05), 0 22px 58px -20px rgba(0,0,0,0.86)",
		"0 0 0 1px rgba(255,255,255,0.05), 0 24px 62px -22px rgba(0,0,0,0.88)",
		"0 0 0 1px rgba(255,255,255,0.05), 0 26px 66px -24px rgba(0,0,0,0.9)",
		"0 0 0 1px rgba(255,255,255,0.06), 0 28px 70px -26px rgba(0,0,0,0.92)",
		"0 0 0 1px rgba(255,255,255,0.06), 0 30px 74px -28px rgba(0,0,0,0.94)",
		"0 0 0 1px rgba(255,255,255,0.06), 0 32px 78px -30px rgba(0,0,0,0.96)",
		"0 0 0 1px rgba(255,255,255,0.06), 0 34px 82px -32px rgba(0,0,0,0.97)",
		"0 0 0 1px rgba(255,255,255,0.07), 0 36px 86px -34px rgba(0,0,0,0.98)",
		"0 0 0 1px rgba(255,255,255,0.07), 0 38px 90px -36px rgba(0,0,0,0.99)",
		"0 0 0 1px rgba(255,255,255,0.07), 0 40px 94px -38px rgba(0,0,0,1)",
		"0 0 0 1px rgba(255,255,255,0.07), 0 42px 98px -40px rgba(0,0,0,1)",
	],
	components: {
		MuiCssBaseline: {
			styleOverrides: {
				"@global": {
					"@font-face": [
						// Inter variable optional placeholder - assume project includes it or fallback.
					],
				},
				body: {
					background: "#000000",
					backgroundImage:
						"radial-gradient(circle at 30% 20%, rgba(159,30,30,0.1), transparent 50%)," +
						"radial-gradient(circle at 85% 70%, rgba(227,179,65,0.1), transparent 60%)",
					minHeight: "100vh",
					WebkitFontSmoothing: "antialiased",
					MozOsxFontSmoothing: "grayscale",
				},
				"*::-webkit-scrollbar": {
					width: 12,
					height: 8,
				},
				"*::-webkit-scrollbar-track": {
					background: "rgba(255,255,255,0.03)",
				},
				"*::-webkit-scrollbar-thumb": {
					background: "linear-gradient(180deg, #5E1212, #9F1E1E)",
					border: "1px solid rgba(0,0,0,0.6)",
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
					color: "#B4B4B8",
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
						borderBottom: "1px solid rgba(255,255,255,0.12)",
					},
					"&:hover:not(.Mui-disabled):before": {
						borderBottom: "1px solid rgba(255,255,255,0.24)",
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
				select: {
					padding: "8px 12px",
					fontSize: "0.95rem",
					backgroundColor: "rgba(0, 0, 0, 0.3)",
					borderRadius: "4px",
					border: "1px solid rgba(255, 255, 255, 0.12)",
					"&:hover": {
						backgroundColor: "rgba(0, 0, 0, 0.4)",
						borderColor: "rgba(255, 255, 255, 0.24)",
					},
					"&.Mui-focused": {
						backgroundColor: "rgba(0, 0, 0, 0.4)",
						borderColor: doomRed.main,
					},
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
					background:
						"linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.45) 100%)",
					border: "1px solid rgba(255,255,255,0.07)",
				},
			},
		},
		MuiDrawer: {
			styleOverrides: {
				paper: ({ theme }) => ({
					backgroundColor: "black",
					borderRight: theme.custom.border.subtle,
					boxShadow:
						"inset 0 0 0 1px rgba(255,255,255,0.05), 0 8px 28px -6px rgba(0,0,0,0.7)",
				}),
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
					backgroundImage:
						"linear-gradient(120deg, rgba(159,30,30,0.9), rgba(94,18,18,0.9))",
					color: doomRed.contrastText,
					boxShadow:
						"0 0 0 1px rgba(255,255,255,0.08), 0 4px 12px -3px rgba(0,0,0,0.6)",
					transition: "background 150ms, transform 120ms",
					"&:hover": {
						backgroundImage:
							"linear-gradient(120deg, rgba(192,41,41,1), rgba(94,18,18,1))",
					},
				},
				outlined: {
					background: "transparent",
					boxShadow: "none",
					border: `${doomRed.main} 1px solid`,
					"&:hover": {
						background: "rgba(159,30,30,0.15)",
					},
				},
			},
		},
		MuiChip: {
			styleOverrides: {
				root: {
					borderRadius: 1,
					backdropFilter: "blur(6px)",
					background:
						"linear-gradient(140deg, rgba(159,30,30,0.35), rgba(159,30,30,0.15))",
					border: "1px solid rgba(255,255,255,0.08)",
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
		MuiListSubheader: {
			defaultProps: {
				sx: {
					padding: 0,
					marginLeft: 2,
					marginBottom: 1,
					fontSize: "12px",
					letterSpacing: 1,
					textTransform: "uppercase",
					fontWeight: 700,
					height: 36,
					color: doomYellow.light,
					background: "transparent",
				},
			},
		},
		MuiListItemButton: {
			styleOverrides: {
				root: {
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
					background:
						"linear-gradient(160deg, rgba(159,30,30,0.85), rgba(94,18,18,0.85))",
					border: "1px solid rgba(255,255,255,0.18)",
					fontSize: "0.7rem",
				},
			},
		},
	},
});

// Expose a few helper tokens (optional) for non-MUI styled components.
export const doomColors = {
	red: doomRed,
	yellow: doomYellow,
	darkBg,
};

// Convenience gradients for direct import.
export const gradients = theme.custom.gradients;
