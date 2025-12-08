import { LockReset } from "@mui/icons-material";
import { Box, Chip, Stack, useTheme } from "@mui/material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";
import { NAVIGATION, type NavigationItem } from "./navigation";

type ItemsWithTitle<
  T extends readonly NavigationItem[],
  Acc extends string[] = [],
> = T extends readonly [
  infer Item extends NavigationItem,
  ...infer Rest extends NavigationItem[],
]
  ? Item extends { title: string }
    ? ItemsWithTitle<Rest, [...Acc, Item["title"]]>
    : ItemsWithTitle<Rest, Acc>
  : Acc[number][];

type Unlocks = ItemsWithTitle<typeof NAVIGATION>;

export function BigAction({
  title,
  description,
  unlocks,
  isLoading,
}: {
  title: string;
  description: string;
  unlocks: Unlocks;
  isLoading: boolean;
}) {
  const theme = useTheme();
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
        setElapsedMs(0);
      }
      if (timerRef.current === null) {
        timerRef.current = window.setInterval(() => {
          if (startTimeRef.current !== null) {
            setElapsedMs(Date.now() - startTimeRef.current);
          }
        }, 1000);
      }
    } else {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      startTimeRef.current = null;
      setElapsedMs(null);
    }

    return () => {
      if (timerRef.current !== null && !isLoading) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLoading]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const elapsedSeconds = Math.max(0, Math.floor((elapsedMs ?? 0) / 1000));
  const showStopwatch = isLoading && elapsedMs !== null;
  return (
    <Card
      sx={{
        position: "relative",
        maxWidth: 500,
        transition: "all 0.3s ease-in-out",
        border: `1px solid ${theme.palette.divider}`,
        ...(isLoading && {
          outline: "3px solid",
          outlineColor: "primary.main",
          boxShadow: `0 0 20px ${theme.palette.secondary.main}80`,
          animation: "pulse 2s ease-in-out infinite",
          "@keyframes pulse": {
            "0%, 100%": {
              boxShadow: `0 0 20px ${theme.palette.secondary.main}80`,
            },
            "50%": {
              boxShadow: `0 0 30px ${theme.palette.secondary.main}80`,
            },
          },
        }),
        ".MuiCardContent-root:last-child": {
          pb: 2,
        },
      }}
    >
      {showStopwatch && (
        <Typography
          variant="subtitle2"
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            px: 1.25,
            py: 0.5,
            backgroundColor: "background.paper",
            borderStyle: "solid",
            borderColor: theme.palette.primary.main,
            borderWidth: "0 0 1px 1px",
            fontWeight: 700,
            color: "error.main",
          }}
        >
          {String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:
          {String(elapsedSeconds % 60).padStart(2, "0")}
        </Typography>
      )}
      <CardContent sx={{ flex: "1 0 auto" }}>
        <Stack direction="column" gap={2}>
          <Stack gap={1}>
            <Typography variant="h5">{title}</Typography>
            <Typography
              variant="subtitle1"
              component="div"
              sx={{ color: "text.secondary" }}
            >
              {description}
            </Typography>
          </Stack>

          <Stack
            sx={{
              direction: "column",
              gap: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <LockReset />

              <Typography>
                {unlocks.length} Unlock{unlocks.length === 1 ? "" : "s"}
              </Typography>
            </Box>

            <Stack sx={{ display: "flex", flexDirection: "row", gap: 1 }}>
              {unlocks.map(unlock => {
                const foundIcon = NAVIGATION.find(
                  item => "title" in item && item.title === unlock,
                );
                const hasIcon =
                  foundIcon && "icon" in foundIcon
                    ? { icon: foundIcon.icon }
                    : {};
                return (
                  <Chip
                    key={unlock}
                    {...hasIcon}
                    label={unlock}
                    sx={{ userSelect: "none" }}
                    size="small"
                  />
                );
              })}
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
