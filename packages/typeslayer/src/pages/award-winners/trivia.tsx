import { Expand, Flag } from "@mui/icons-material";
import {
  Box,
  Chip,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { InlineCode, LinkKindTable, panelBackground } from "@typeslayer/common";
import type { TypeId } from "@typeslayer/validate";
import { useCallback, useState } from "react";
import { CenterLoader } from "../../components/center-loader";
import { DisplayRecursiveType } from "../../components/display-recursive-type";
import { NoData } from "../../components/no-data";
import { TypeSummary } from "../../components/type-summary";
import {
  useLargestDisplayValues,
  useLinkKindDataByKind,
  useTypeKinds,
} from "../../hooks/tauri-hooks";
import { AwardNavItem } from "./award-nav-item";
import {
  AWARD_SELECTOR_COLUMN_WIDTH,
  type AwardId,
  MaybePathCaption,
} from "./awards";
import { InlineBarGraph } from "./inline-bar-graph";
import { TitleSubtitle } from "./title-subtitle";

const trivia = [
  "trivia_typeKinds",
  "trivia_relations",
  "trivia_largestDisplay",
] satisfies AwardId[];
type TriviaAwardId = (typeof trivia)[number];

export const TriviaNavItems = () => {
  const { data: typeKinds } = useTypeKinds();
  const { data: largestDisplay } = useLargestDisplayValues();

  const getValue = (awardId: TriviaAwardId): number => {
    switch (awardId) {
      case "trivia_typeKinds":
        return typeKinds?.length ?? 0;
      case "trivia_relations":
        return typeKinds?.length ?? 0;
      case "trivia_largestDisplay":
        return largestDisplay?.[0]?.displayBytes ?? 0;
    }
  };

  return (
    <>
      <ListSubheader>Trivia</ListSubheader>
      {trivia.map(awardId => (
        <AwardNavItem
          key={awardId}
          awardId={awardId}
          value={getValue(awardId)}
        />
      ))}
    </>
  );
};

export const TriviaAwardPage = ({ awardId }: { awardId: TriviaAwardId }) => {
  switch (awardId) {
    case "trivia_typeKinds":
      return <TriviaTypeKinds />;

    case "trivia_relations":
      return <TriviaRelations />;

    case "trivia_largestDisplay":
      return <TriviaLargestDisplay />;

    default:
      awardId satisfies never;
      throw new Error(`Unknown award: ${awardId}`);
  }
};

const TriviaTypeKinds = () => {
  const { data: typeKinds } = useTypeKinds();

  if (!typeKinds) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack
      sx={{
        p: 1,
        pt: 2,
        gap: 1,
      }}
    >
      <TitleSubtitle
        title="Type Kinds"
        subtitle={
          <Typography>
            this is just for fun - a list of all the kinds of types in your
            project
          </Typography>
        }
        icon={<Flag fontSize="large" />}
      />

      <Stack
        sx={{
          px: 2,
          py: 1,
          mx: 2,
          border: 1,
          borderColor: "divider",
          backgroundColor: panelBackground,
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="right">Count</TableCell>
              <TableCell>Percentage</TableCell>
              <TableCell>Type Flags</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {typeKinds.map(([count, percentage, flags]) => (
              <TableRow key={flags.join(",")}>
                <TableCell align="right">
                  <Stack
                    sx={{
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      gap: 1,
                    }}
                  >
                    <InlineCode>{count.toLocaleString()}</InlineCode>
                  </Stack>
                </TableCell>
                <TableCell align="left">
                  <Stack sx={{ marginTop: "-6px", py: "2px" }}>
                    <Typography color="text.secondary" sx={{ fontSize: "1em" }}>
                      {percentage}
                    </Typography>

                    <Box
                      sx={{
                        position: "relative",
                        width: "100%",
                        height: 3,
                        backgroundColor: "divider",
                        marginTop: "0px",
                      }}
                    >
                      <Box
                        sx={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          backgroundColor: "secondary.main",
                          width: percentage,
                          height: 3,
                        }}
                      />
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack
                    sx={{ gap: 1, flexDirection: "row", flexWrap: "wrap" }}
                  >
                    {flags.map(flag => (
                      <Chip
                        key={flag}
                        label={flag}
                        sx={{ height: 20, justifySelf: "center" }}
                      />
                    ))}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Stack>
    </Stack>
  );
};

const TriviaRelations = () => {
  const { data } = useLinkKindDataByKind();
  return (
    <Stack
      sx={{
        p: 1,
        pt: 2,
        gap: 1,
      }}
    >
      <TitleSubtitle
        title="Type Relations"
        subtitle={
          <Typography>
            this is just for fun - a list of all the kinds of types in your
            project
          </Typography>
        }
        icon={<Flag fontSize="large" />}
      />
      <Stack
        sx={{
          mx: 2,
        }}
      >
        <LinkKindTable linkKindDataByKind={data} />
      </Stack>
    </Stack>
  );
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kib = bytes / 1024;
  if (kib < 1024) {
    return `${kib.toFixed(1)} KiB`;
  }
  const mib = kib / 1024;
  return `${mib.toFixed(1)} MiB`;
};

const TriviaLargestDisplay = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { data: entries, isLoading } = useLargestDisplayValues();

  const hasData = entries !== undefined;
  const hasItems = (entries?.length ?? 0) > 0;
  const maxBytes = entries?.[0]?.displayBytes ?? 0;

  const handleListItemClick = useCallback(
    (_event: React.MouseEvent<HTMLDivElement, MouseEvent>, index: number) => {
      setSelectedIndex(index);
    },
    [],
  );

  const selectedNode: TypeId | undefined = entries?.[selectedIndex]?.typeId;

  const items = (
    <List>
      {entries?.map((entry, index) => (
        <ListItemButton
          key={entry.typeId}
          selected={index === selectedIndex}
          onClick={event => handleListItemClick(event, index)}
        >
          <ListItemText>
            <Stack sx={{ flexGrow: 1 }} gap={0}>
              <TypeSummary
                typeId={entry.typeId}
                name={entry.name}
                flags={[]}
                showFlags={false}
                suppressActions
              />
              <Stack gap={0.5}>
                <MaybePathCaption maybePath={entry.path} />
                <InlineBarGraph
                  label={formatBytes(entry.displayBytes)}
                  width={`${(entry.displayBytes / maxBytes) * 100}%`}
                  rank={index + 1}
                />
              </Stack>
            </Stack>
          </ListItemText>
        </ListItemButton>
      ))}
    </List>
  );

  return (
    <Stack
      sx={{
        flexDirection: "row",
        alignItems: "flex-start",
        height: "100%",
      }}
    >
      <Stack
        sx={{
          width: AWARD_SELECTOR_COLUMN_WIDTH,
          background: hasItems ? "#000000" : "transparent",
          flexShrink: 0,
          p: 1,
          pt: 2,
          overflowY: "auto",
          maxHeight: "100%",
          minHeight: "100%",
          borderRight: 1,
          borderColor: hasItems ? "divider" : "transparent",
        }}
      >
        <TitleSubtitle
          title="Largest Display Values"
          subtitle={
            <Typography>
              types with the largest string representation. while this isn't
              always bad, if you see them getting into the kilobytes in size you
              should prolly take a look.
            </Typography>
          }
          icon={<Expand fontSize="large" />}
        />

        {isLoading ? (
          <CenterLoader />
        ) : hasData ? (
          hasItems ? (
            items
          ) : (
            <NoData />
          )
        ) : (
          <NoData />
        )}
      </Stack>

      <Box
        sx={{
          p: 3,
          overflowY: "auto",
          maxHeight: "100%",
          width: "100%",
          height: "100%",
        }}
      >
        {selectedNode ? <DisplayRecursiveType id={selectedNode} /> : null}
      </Box>
    </Stack>
  );
};
