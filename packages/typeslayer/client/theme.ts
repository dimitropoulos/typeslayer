import { createTheme } from "@mui/material";

export const theme = createTheme({
	palette: {
		mode: "dark",
	},
	components: {
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
			}
		}
	}
});
