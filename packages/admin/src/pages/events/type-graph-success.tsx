import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { InlineCode } from "@typeslayer/common";
import type { EventTypeGraphSuccess } from "@typeslayer/rust-types";
import { StatChip } from "../../components/stat-chip";
import type { D1Event } from "../../hooks";
import { EventPage } from "./event-base";

export const TypeGraphSuccess = () => (
  <EventPage eventName="type_graph_success">
    {event => <Page event={event} />}
  </EventPage>
);

const Page = ({ event }: { event: D1Event<EventTypeGraphSuccess> }) => {
  return (
    <>
      <Stack sx={{ flexDirection: "row", gap: 2, mb: 2 }}>
        <StatChip label="nodes" value={event.data.nodeCount.toLocaleString()} />
        <StatChip label="links" value={event.data.linkCount.toLocaleString()} />
        <StatChip
          label="duration"
          value={`${event.data.duration.toLocaleString()} ms`}
        />
      </Stack>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Link Kind</TableCell>
            <TableCell align="right">byTarget (max)</TableCell>
            <TableCell align="right">byTarget (count)</TableCell>
            <TableCell align="right">bySource (max)</TableCell>
            <TableCell align="right">bySource (count)</TableCell>
            <TableCell align="right">total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(event.data.linkKindDataByKind).map(([kind, data]) => (
            <TableRow key={kind}>
              <TableCell>
                <InlineCode>{kind}</InlineCode>
              </TableCell>
              <TableCell align="right">
                {data.byTarget.max.toLocaleString()}
              </TableCell>
              <TableCell align="right">
                {data.byTarget.count.toLocaleString()}
              </TableCell>
              <TableCell align="right">
                {data.bySource.max.toLocaleString()}
              </TableCell>
              <TableCell align="right">
                {data.bySource.count.toLocaleString()}
              </TableCell>
              <TableCell align="right">
                {data.linkCount.toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
};
