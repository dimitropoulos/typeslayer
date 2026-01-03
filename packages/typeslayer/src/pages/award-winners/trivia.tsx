import { Flag } from "@mui/icons-material";
import {
  Box,
  Chip,
  CircularProgress,
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
import { useLinkKindDataByKind, useTypeKinds } from "../../hooks/tauri-hooks";
import { AwardNavItem } from "./award-nav-item";
import type { AwardId } from "./awards";
import { TitleSubtitle } from "./title-subtitle";

const trivia = ["trivia_typeKinds", "trivia_relations"] satisfies AwardId[];
type TriviaAwardId = (typeof trivia)[number];

export const TriviaNavItems = () => {
  const { data: typeKinds } = useTypeKinds();

  return (
    <>
      <ListSubheader>Trivia</ListSubheader>
      {trivia.map(awardId => (
        <AwardNavItem
          key={awardId}
          awardId={awardId}
          value={typeKinds?.length ?? 0}
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
