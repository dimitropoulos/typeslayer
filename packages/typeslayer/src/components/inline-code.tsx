import { theme } from "../theme";

export const InlineCode = ({
  children,
  secondary = false,
  style,
}: {
  children: React.ReactNode;
  secondary?: boolean;
  style?: React.CSSProperties;
}) => (
  <code
    style={{
      color: theme.palette[secondary ? "secondary" : "primary"].light,
      ...style,
    }}
  >
    {children}
  </code>
);
