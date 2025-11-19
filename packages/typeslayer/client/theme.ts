import { createTheme } from "@mui/material";
import { red, yellow } from "@mui/material/colors";

export const theme = createTheme({
	palette: {
		primary: red,
		secondary: yellow,
		mode: "dark",
	},
	components: {
		MuiButtonBase: {
			defaultProps: {
				disableRipple: true,
			}
		},
		MuiListSubheader: {
			defaultProps: {
				sx: {
					pl: 1,
					py: 0,
					my: 0,
					fontSize: "12px",
					fontWeight: 700,
					height: 40,
				},
			},
		},
	},
});
