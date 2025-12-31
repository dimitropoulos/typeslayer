import { Table, TableBody, TableCell, TableRow } from "@mui/material";

export const StatTable = ({
  items,
}: {
  items: { label: string; data: unknown }[];
}) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <Table size="small">
      <TableBody>
        {items.map(({ label, data }) => (
          <TableRow key={label}>
            <TableCell>{label}</TableCell>
            <TableCell>
              {typeof data === "string" || typeof data === "number"
                ? data
                : JSON.stringify(data, null, 2)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
