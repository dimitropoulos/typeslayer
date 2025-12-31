import type { CSSProperties, ReactNode } from "react";
import { muiTheme } from "./mui-theme";

export const InlineCode = ({
  children,
  primary = false,
  style,
}: {
  children: ReactNode;
  primary?: boolean;
  style?: CSSProperties;
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
