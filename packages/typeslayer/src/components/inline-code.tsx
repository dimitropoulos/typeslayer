import { muiTheme } from "@typeslayer/common";

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
      color: muiTheme.palette[primary ? "primary" : "secondary"].light,
      ...style,
    }}
  >
    {children}
  </code>
);
