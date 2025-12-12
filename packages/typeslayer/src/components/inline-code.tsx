import { theme } from "../theme";

export const InlineCode = ({
  children,
  primary = false,
  style,
}: {
  children: React.ReactNode;
  primary?: boolean;
  style?: React.CSSProperties;
}) => (
  <code
    style={{
      color: theme.palette[primary ? "primary" : "secondary"].light,
      ...style,
    }}
  >
    {children}
  </code>
);
