import { ContentCopy, Description, Done } from "@mui/icons-material";
import { Box, type BoxProps, IconButton, Tooltip } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { type BundledLanguage, codeToHtml } from "shiki";
import { shikiTheme } from "../shikiTheme";
import { OpenablePath } from "./openable-path";
import { ShowMore } from "./show-more";

const toDisplayString = (value: string, maxSize: number) => {
  if (!value || typeof value !== "string") {
    return "";
  }
  if (value.length <= maxSize) {
    return value;
  }
  return `${value.slice(0, maxSize)}\n...`;
};

export const Code = ({
  value,
  maxHeight,
  fileName,
  openableFilename,
  lang,
  maxSize = 1024 * 10,
  disableSyntaxHighlighting,
  copyThisInstead,
  ...boxProps
}: {
  /** Data to render. Strings are parsed if they look like JSON, otherwise rendered as-is. */
  value: string;
  /** Optional max height for the code box. */
  maxHeight?: number | string;
  /** file name or path for the code snippet */
  fileName?: string;
  openableFilename?: boolean | undefined;
  /** language for syntax highlighting */
  lang?: BundledLanguage;
  maxSize?: number;
  disableSyntaxHighlighting?: boolean | undefined;
  copyThisInstead?: string | undefined;
} & BoxProps) => {
  const code = useMemo(() => toDisplayString(value, maxSize), [value, maxSize]);
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const overflowed = value.length > maxSize;

  useEffect(() => {
    let cancelled = false;

    const highlight = async () => {
      try {
        const rendered = await codeToHtml(code, {
          lang: lang ?? "json",
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
  }, [code, lang, disableSyntaxHighlighting]);

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
            p: 1,
            userSelect: "none",
            display: "flex",
            gap: 1,
          }}
        >
          <Description fontSize="small" color="disabled" />
          {openableFilename ? (
            <OpenablePath
              absolutePath={fileName}
              forceAbsolute
              propertyTextStyle={{
                fontFamily: "monospace",
                fontSize: "0.85rem",
                fontWeight: "bold",
              }}
            />
          ) : (
            fileName
          )}
        </Box>
      )}
      <Box
        component="div"
        sx={{
          p: 2,
          paddingRight: 5,
          backgroundColor: "#11111190",
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
                  await navigator.clipboard.writeText(copyThisInstead ?? code);
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
        {overflowed ? (
          <ShowMore
            displayLimit={maxSize}
            incrementsOf={10}
            setDisplayLimit={() => {}}
            totalItems={100}
          />
        ) : null}
      </Box>
    </Box>
  );
};
