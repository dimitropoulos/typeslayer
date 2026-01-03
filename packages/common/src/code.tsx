import ContentCopy from "@mui/icons-material/ContentCopy";
import Done from "@mui/icons-material/Done";
import { Box, type BoxProps, IconButton, Tooltip } from "@mui/material";
import { useEffect, useState } from "react";
import { type BundledLanguage, codeToHtml } from "shiki";
import { panelBackground } from "./mui-theme";
import { shikiTheme } from "./shiki-theme";

export const Code = ({
  value,
  maxHeight,
  title,
  lang = "json",
  disableSyntaxHighlighting,
  copyThisInstead,
  ...boxProps
}: {
  /** Data to render. Strings are parsed if they look like JSON, otherwise rendered as-is. */
  value: string;
  /** Optional max height for the code box. */
  maxHeight?: number | string;
  /** file name or path for the code snippet */
  title?: string;
  /** language for syntax highlighting */
  lang?: BundledLanguage;
  disableSyntaxHighlighting?: boolean | undefined;
  copyThisInstead?: string | undefined;
} & BoxProps) => {
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const highlight = async () => {
      try {
        const rendered = await codeToHtml(value, {
          lang,
          theme: shikiTheme,
          rootStyle: "background-color: transparent; margin: 0;",
        });

        if (!cancelled) {
          setHtml(rendered);
        }
      } catch (_error) {
        if (!cancelled) {
          setHtml(null);
        }
      }
    };

    if (disableSyntaxHighlighting) {
      setHtml(null);
      return;
    }

    void highlight();

    return () => {
      cancelled = true;
    };
  }, [value, lang, disableSyntaxHighlighting]);

  const { sx: boxPropsSx, ...boxPropsRest } = boxProps;

  return (
    <Box
      sx={{
        ...boxPropsSx,
      }}
      {...boxPropsRest}
    >
      {title && (
        <Box
          sx={{
            backgroundColor: "background.paper",
            border: 1,
            borderColor: "divider",
            borderBottom: 0,
            p: 1,
            userSelect: "none",
            display: "flex",
            gap: 1,
            alignItems: "center",
            fontFamily: "monospace",
            fontSize: "0.85rem",
            fontWeight: "bold",
          }}
        >
          {title}
        </Box>
      )}
      <Box
        component="div"
        sx={{
          p: 2,
          paddingRight: 5,
          backgroundColor: panelBackground,
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          overflow: "auto",
          maxHeight,
          position: "relative",
        }}
      >
        <Box sx={{ position: "absolute", top: 8, right: 8 }}>
          <Tooltip title={copied ? "Copied" : "Copy"} placement="left">
            <IconButton
              size="small"
              aria-label="copy code"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(copyThisInstead ?? value);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                } catch (_error) {
                  setCopied(false);
                }
              }}
            >
              {copied ? (
                <Done fontSize="small" />
              ) : (
                <ContentCopy fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>

        {html ? (
          <Box
            component="div"
            sx={{ m: 0 }}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: rendered HTML from Shiki
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <Box component="pre" sx={{ m: 0 }}>
            {value}
          </Box>
        )}
      </Box>
    </Box>
  );
};
