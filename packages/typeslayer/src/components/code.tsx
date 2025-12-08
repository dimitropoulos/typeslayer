import { ContentCopy, Description, Done } from "@mui/icons-material";
import { Box, type BoxProps, IconButton, Tooltip } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { type BundledLanguage, codeToHtml } from "shiki";

export type CodeProps = {
  /** Data to render. Strings are parsed if they look like JSON, otherwise rendered as-is. */
  value: unknown;
  /** Optional max height for the code box. */
  maxHeight?: number | string;
  /** file name or path for the code snippet */
  fileName?: string;

  /** language for syntax highlighting */
  lang?: BundledLanguage;
} & BoxProps;

const normalizeValue = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return value;
  }
};

const toDisplayString = (value: unknown) => {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch (_error) {
    return String(value);
  }
};

export const Code = ({
  value,
  maxHeight,
  fileName,
  lang,
  ...boxProps
}: CodeProps) => {
  const normalized = useMemo(() => normalizeValue(value), [value]);
  const code = useMemo(() => toDisplayString(normalized), [normalized]);
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const highlight = async () => {
      try {
        const rendered = await codeToHtml(code, {
          lang: lang ?? "json",
          theme: "github-dark-high-contrast",
          // make the background transparent
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

    void highlight();

    return () => {
      cancelled = true;
    };
  }, [code, lang]);

  const { sx: boxPropsSx, ...boxPropsRest } = boxProps;

  return (
    <Box
      sx={{
        ...boxPropsSx,
      }}
      {...boxPropsRest}
    >
      {fileName && (
        <Box
          sx={{
            backgroundColor: "background.paper",
            border: 1,
            borderColor: "divider",
            borderBottom: 0,
            color: "secondary.main",
            fontFamily: "monospace",
            p: 1,
            borderRadius: 1,
            fontSize: "0.85rem",
            fontWeight: "bold",
            userSelect: "none",
            display: "flex",
            gap: 1,
          }}
        >
          <Description fontSize="small" color="disabled" />
          {fileName}
        </Box>
      )}
      <Box
        component="div"
        sx={{
          p: 2,
          paddingRight: 5,
          bgcolor: "background.paper",
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
                  await navigator.clipboard.writeText(code);
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
            {code}
          </Box>
        )}
      </Box>
    </Box>
  );
};
