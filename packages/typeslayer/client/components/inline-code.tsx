import { theme } from "../theme";

export const InlineCode = ({
	children,
	secondary = false,
}: {
	children: React.ReactNode;
	secondary?: boolean;
}) => (
	<code
		style={{ color: theme.palette[secondary ? "secondary" : "primary"].dark }}
	>
		{children}
	</code>
);
