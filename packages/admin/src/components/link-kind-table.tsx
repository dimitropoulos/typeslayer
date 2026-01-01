import { ExpandMore } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AlertTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridColumnGroupingModel,
} from "@mui/x-data-grid";
import { InlineCode, panelBackground } from "@typeslayer/common";
import type { LinkKind, StrippedLinkKindData } from "@typeslayer/rust-types";
import { Code } from "./code";

const columns: GridColDef[] = [
  {
    field: "relation",
    headerName: "Relation",
    width: 250,
    renderCell: params => <InlineCode>{params.value}</InlineCode>,
  },
  {
    field: "sourceCount",
    headerName: "count",
    type: "number",
    width: 100,
    headerAlign: "center",
    align: "right",
    valueFormatter: (value: number) => value.toLocaleString(),
  },
  {
    field: "sourceMax",
    headerName: "max",
    type: "number",
    width: 100,
    headerAlign: "center",
    align: "right",
    valueFormatter: (value: number) => value.toLocaleString(),
  },
  {
    field: "targetCount",
    headerName: "count",
    type: "number",
    width: 100,
    headerAlign: "center",
    align: "right",
    valueFormatter: (value: number) => value.toLocaleString(),
  },
  {
    field: "targetMax",
    headerName: "max",
    type: "number",
    width: 100,
    headerAlign: "center",
    align: "right",
    valueFormatter: (value: number) => value.toLocaleString(),
  },
  {
    field: "total",
    headerName: "Total",
    type: "number",
    width: 120,
    headerAlign: "center",
    align: "right",
    valueFormatter: (value: number) => value.toLocaleString(),
  },
] satisfies GridColDef[];

const totalWidth = columns.reduce((sum, col) => sum + (col.width ?? 100), 0) + 2;

const columnGroupingModel = [
  {
    groupId: "source",
    headerName: "Source",
    headerAlign: "center",
    children: [{ field: "sourceCount" }, { field: "sourceMax" }],
  },
  {
    groupId: "target",
    headerName: "Target",
    headerAlign: "center",
    children: [{ field: "targetCount" }, { field: "targetMax" }],
  },
] satisfies GridColumnGroupingModel;

const exampleTypes = [
  {
    id: 100,
    flags: ["StringLiteral"],
    display: '"red"',
  },
  {
    id: 101,
    flags: ["StringLiteral"],
    display: '"green"',
  },
  {
    id: 102,
    flags: ["StringLiteral"],
    display: '"blue"',
  },
  { id: 103, flags: ["Union"], unionTypes: [100, 101, 102] },
];

const stringifiedExample = `[\n  ...\n${exampleTypes.map(t => `  ${JSON.stringify(t)}`).join(",\n")},\n  ...\n]`;

export const LinkKindTable = ({
  linkKindDataByKind,
}: {
  linkKindDataByKind:
    | Partial<Record<LinkKind, StrippedLinkKindData>>
    | undefined;
}) => {
  if (!linkKindDataByKind || Object.keys(linkKindDataByKind).length === 0) {
    return <Typography>No link kind data available.</Typography>;
  }

  const rows = Object.entries(linkKindDataByKind).map(([kind, data]) => ({
    id: kind,
    relation: kind,
    sourceCount: data.bySource.count,
    sourceMax: data.bySource.max,
    targetCount: data.byTarget.count,
    targetMax: data.byTarget.max,
    total: data.linkCount,
  }));

  return (
    <Stack sx={{ pb: 2 }}>
      <Explainer linkKindDataByKind={linkKindDataByKind} />

      <DataGrid
        rows={rows}
        columns={columns}
        columnGroupingModel={columnGroupingModel}
        autoHeight
        autoPageSize
        hideFooter
        disableRowSelectionOnClick
        sx={{
          border: 1,
          borderColor: "divider",
          "& .MuiDataGrid-cell--textRight": {
            fontFamily: "monospace !important",
          },
          background: panelBackground,
          width: totalWidth
        }}
      />
    </Stack>
  );
};

const Explainer = ({
  linkKindDataByKind,
}: {
  linkKindDataByKind:
    | Partial<Record<LinkKind, StrippedLinkKindData>>
    | undefined;
}) => {
  return (
    <Accordion sx={{ width: totalWidth }}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Stack
          sx={{
            gap: 2,
            alignItems: "center",
            flexDirection: "row",
          }}
        >
          <Typography variant="h6">what's all this stuff mean??</Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack sx={{ gap: 1 }}>
          <Typography>
            this is pretty heavy-duty deep TypeScript compiler stuff. but if you
            take a breath and slow down you can understand it! let's talk about
            the first row, <InlineCode>unionTypes</InlineCode>, as an example.
          </Typography>
          <Typography>
            TypeScript unions, in the TypeScript compiler's representation, have
            a property called <InlineCode>unionTypes</InlineCode>. it's just an
            array of all the type ids that make up the union.
          </Typography>
          <Typography>
            in TypeScript parlance, the alias for the whole union type itself
            would be the <em>source</em> and the types that make it up would be
            the <em>targets</em>.
          </Typography>
          <Typography>here's an example:</Typography>
          <Code lang="ts" value="type Colors = 'red' | 'green' | 'blue';" />
          <Typography>
            TypeScript will generate 4 types internally: one for each of the
            three string literals and one for the union itself:
          </Typography>
          <Code lang="json" value={stringifiedExample} />
          <Alert severity="info">
            <AlertTitle>btw</AlertTitle>
            <Stack sx={{ gap: 1 }}>
              <Typography>
                this is pretty much identical to what you'd get from TypeScript
                in this situation! that's all TypeSlayer has to work with! now
                just imagine having over a million types like this, and then
                trying to piece them all back together to get a complete picture
                of their relationships! the extreme difficulty of that task is a
                core reason why TypeSlayer exists in the first place.
              </Typography>
              <Typography>
                I'll invite you to take a moment to notice that the name{" "}
                <InlineCode>Colors</InlineCode> is completely missing!
              </Typography>
              <Typography>
                To make matters worse, if you only were looking at one of the{" "}
                <InlineCode>StringLiteral</InlineCode> union member types....{" "}
                <em>
                  you wouldn't be able to actually tell that they're part of a
                  union somewhere!
                </em>{" "}
                that's something that TypeSlayer solves for you.
              </Typography>
            </Stack>
          </Alert>
          <Stack sx={{ gap: 3 }}>
            <Typography sx={{ marginTop: 1 }}>
              so let's talk about these columns:
            </Typography>
            <Stack sx={{ gap: 0.5 }}>
              <Stack>
                <Typography variant="h5">Source | count</Typography>
                <Typography variant="subtitle2">
                  the total of types in your project that directly start this
                  relation
                </Typography>
              </Stack>
              <Typography>
                in your code you see that in the row for the{" "}
                <InlineCode>unionTypes</InlineCode> relation, the first column
                is <InlineCode>Source | count</InlineCode> and it has the value{" "}
                <InlineCode>
                  {linkKindDataByKind?.unionTypes?.bySource.count.toLocaleString()}
                </InlineCode>
                . that's telling you{" "}
                <em>
                  the total number of types in this project that are unions.
                </em>{" "}
                Just like <InlineCode>Colors</InlineCode> in the example above.
                in your project's case, there are{" "}
                <InlineCode>
                  {linkKindDataByKind?.unionTypes?.bySource.count.toLocaleString()}
                </InlineCode>{" "}
                of them - all distinct unions.
              </Typography>
              <Typography>
                you can think of source types as the "parents" in this
                relationship - they are the types that directly have this kind
                of relation to other types.
              </Typography>
            </Stack>

            <Stack sx={{ gap: 0.5 }}>
              <Stack>
                <Typography variant="h5">Source | max</Typography>
                <Typography variant="subtitle2">
                  the maximum size of the array of relations of this type any
                  source type has
                </Typography>
              </Stack>
              <Typography>
                the next column, <InlineCode>Source | max</InlineCode>, is
                telling you the maximum number of types that make up any single
                union type. in our example above, that would be{" "}
                <InlineCode>3</InlineCode>, since{" "}
                <InlineCode>Colors</InlineCode> is made up of{" "}
                <InlineCode>3</InlineCode> string literal types.
              </Typography>
              <Typography>
                in your project's case, the value is{" "}
                <InlineCode>
                  {linkKindDataByKind?.unionTypes?.bySource.max.toLocaleString()}
                </InlineCode>
                . that means that the largest union type in your project has{" "}
                <InlineCode>
                  {linkKindDataByKind?.unionTypes?.bySource.max.toLocaleString()}
                </InlineCode>{" "}
                individual members. TypeScript starts erroring at{" "}
                <InlineCode>{(100_000).toLocaleString()}</InlineCode> union
                members, for example.
              </Typography>
            </Stack>

            <Stack sx={{ gap: 0.5 }}>
              <Stack>
                <Typography variant="h5">Target | count</Typography>
                <Typography variant="subtitle2">
                  the total number of unique types that are used as members of
                  union types
                </Typography>
              </Stack>
              <Typography>
                the next column group, <InlineCode>Target</InlineCode>, is all
                about the types that are being referenced by those union types.
                so the <InlineCode>Target | count</InlineCode> column is telling
                you{" "}
                <em>
                  the total number of unique types that are used as members of
                  union types
                </em>{" "}
                throughout your project. in our example above, that would be 3,
                since we have 3 unique string literal types.
              </Typography>
              <Typography>
                in your project's case, the value is{" "}
                <InlineCode>
                  {linkKindDataByKind?.unionTypes?.byTarget.count.toLocaleString()}
                </InlineCode>
                . that means that across all union types in your project, there
                are{" "}
                <InlineCode>
                  {linkKindDataByKind?.unionTypes?.byTarget.count.toLocaleString()}
                </InlineCode>{" "}
                types that are used as members in all of those unions, combined.
              </Typography>
              <Typography>
                you can think of target types as the "children" in this
                relationship - they are the types that are directly referenced
                by the source types via this kind of relation.
              </Typography>
            </Stack>

            <Stack sx={{ gap: 0.5 }}>
              <Stack>
                <Typography variant="h5">Target | max</Typography>
                <Typography variant="subtitle2">
                  the maximum number of types that are used as members of any
                  single union type
                </Typography>
              </Stack>
              <Typography>
                finally, the <InlineCode>Total</InlineCode> column is just the
                total number of links of this kind in your project. so in our
                example, that's 3, since there are 3 links from the{" "}
                <InlineCode>Colors</InlineCode> union type to its 3 member
                types.
              </Typography>
            </Stack>

            <Stack sx={{ gap: 0.5 }}>
              <Stack>
                <Typography variant="h5">Total</Typography>
                <Typography variant="subtitle2">
                  the sum of all relations of this kind in your project
                </Typography>
              </Stack>
              <Typography>
                finally, the <InlineCode>Total</InlineCode> column is just the
                total number of links of this kind in your project. so in our
                example, that's 3, since there are 3 links from the{" "}
                <InlineCode>Colors</InlineCode> union type to its 3 member
                types.
              </Typography>
              <Typography>
                in your project's case, the value is{" "}
                <InlineCode>
                  {linkKindDataByKind?.unionTypes?.linkCount.toLocaleString()}
                </InlineCode>
                . that means that across all union types in your project, there
                are a total of{" "}
                <InlineCode>
                  {linkKindDataByKind?.unionTypes?.linkCount.toLocaleString()}
                </InlineCode>{" "}
                links from those union types to their member types.
              </Typography>
            </Stack>
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Typography>
            hopefully, armed with this knowledge, you can now make sense of the
            rest of the data in this table! each row is a type relationship just
            like the <InlineCode>unionTypes</InlineCode> row we just talked
            through, but for a different property that TypeScript uses
            internally to represent relationships between types.
          </Typography>
          <Typography>
            do keep in mind that although <InlineCode>unionTypes</InlineCode> is
            a <em>"one to many"</em> kind of parent-child relationship, not all
            type relationships are like that. most of them are actually{" "}
            <em>"one to one"</em> relationships, meaning that each source type
            links to exactly one target type. in those cases, the "max" columns
            will always be 1.
          </Typography>
          <Typography>
            if if you see a <InlineCode>0</InlineCode> somewhere - don't fret!
            that just means that that specific type relationship doesn't exist
            in your codebase. many projects won't use every single TypeScript
            type feature, after all.
          </Typography>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};
