import type { ThemeRegistrationAny } from "shiki";
import { muiTheme } from "./mui-theme";

export const shikiTheme = {
  name: "typeslayer-dark",
  type: "dark",
  tokenColors: [
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: {
        foreground: muiTheme.palette.text.disabled,
        fontStyle: "italic",
      },
    },
    {
      scope: ["keyword", "storage.type", "storage.modifier"],
      settings: {
        foreground: muiTheme.palette.primary.main,
        fontStyle: "bold",
      },
    },
    {
      scope: ["string", "constant.other.symbol"],
      settings: { foreground: muiTheme.palette.secondary.main },
    },
    {
      scope: ["variable", "identifier", "meta.definition.variable"],
      settings: { foreground: muiTheme.palette.text.primary },
    },
    {
      scope: ["constant.numeric"],
      settings: { foreground: muiTheme.palette.secondary.light },
    },
    {
      scope: ["entity.name.function", "support.function"],
      settings: { foreground: muiTheme.palette.success.main },
    },
    {
      scope: ["entity.name.type", "support.type"],
      settings: { foreground: "#dddddd" },
    },
    {
      scope: ["entity.name.class", "entity.name.namespace"],
      settings: { foreground: muiTheme.palette.primary.contrastText },
    },
    {
      scope: ["invalid", "invalid.deprecated"],
      settings: {
        foreground: muiTheme.palette.error.main,
      },
    },
    {
      scope: ["markup.bold"],
      settings: { fontStyle: "bold" },
    },
    {
      scope: ["markup.italic"],
      settings: { fontStyle: "italic" },
    },
  ],
} satisfies ThemeRegistrationAny;
