import { Box, Divider, Stack, TextField, Typography } from "@mui/material";
import { useNavigate, useParams } from "@tanstack/react-router";
import { TYPES_JSON_FILENAME } from "@typeslayer/validate";
import { useEffect, useState } from "react";
import { Callout } from "../components/callout";
import { CenterLoader } from "../components/center-loader";
import { Code } from "../components/code";
import { DisplayRecursiveType } from "../components/display-recursive-type";
import { InlineCode } from "../components/inline-code";
import { StatPill } from "../components/stat-pill";
import { TypeRelationsContent } from "../components/type-relations-dialog";
import { useTypeRegistry } from "./award-winners/use-type-registry";

export const SearchTypes = () => {
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const typeIdParam = params.typeId as string | undefined;

  const [search, setSearch] = useState(typeIdParam || "");

  // Sync search with URL param
  useEffect(() => {
    if (typeIdParam && typeIdParam !== search) {
      setSearch(typeIdParam);
    }
  }, [typeIdParam, search]);

  const numberSearch = Number.parseInt(search, 10);

  const { typeRegistry, isLoading } = useTypeRegistry();

  const typeString = JSON.stringify(typeRegistry[numberSearch], null, 2);

  const callout = (
    <Callout title="What's a type id?">
      <Typography>
        During typechecking, the TypeScript compiler assigns a unique{" "}
        <InlineCode primary>id</InlineCode> to every type it encounters. To
        interact with the TypeSlayer, you'll find yourself using these
        identifiers a lot.
      </Typography>
      <Typography>
        This may seem like an annoying detail, and you may be wondering why you
        can't just search by name. But consider that actually most types
        anonymous, and don't even have names.
      </Typography>
      <Typography>
        Also, as strange as this may sound, almost every TypeScript codebase has
        many distinct types that share the same name. Consider a codebase that
        names generic parameters <InlineCode primary>T</InlineCode>. The
        TypeScript compiler will assign a different{" "}
        <InlineCode primary>id</InlineCode> to each of these types, even though
        they all have the same name.
      </Typography>
    </Callout>
  );

  return (
    <Box sx={{ px: 4, overflow: "auto", height: "100%" }}>
      <Stack
        sx={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 1,
          mt: 4,
          mb: 2,
          width: "50%",
          minWidth: "50%",
          maxWidth: "50%",
        }}
      >
        <Typography variant="h2">Search</Typography>
        {typeRegistry.length > 1 ? (
          <StatPill label="Types" value={typeRegistry.length - 1} />
        ) : null}
      </Stack>
      <Stack gap={3}>
        <TextField
          placeholder="search by type id"
          variant="outlined"
          type="number"
          sx={{
            width: "50%",
            minWidth: "50%",
            maxWidth: "50%",
          }}
          value={search}
          onChange={event => {
            const newValue = event.target.value;
            setSearch(newValue);
            if (newValue) {
              navigate({ to: `/search/${newValue}` });
            } else {
              navigate({ to: "/search" });
            }
          }}
        />
        <Stack gap={4} direction="row">
          <Stack
            width="50%"
            sx={{
              width: "50%",
              minWidth: "50%",
              maxWidth: "50%",
              overflow: "auto",
              height: "100%",
              gap: 3,
            }}
          >
            {isLoading ? (
              <CenterLoader />
            ) : (
              <DisplayRecursiveType id={numberSearch} />
            )}

            {typeString ? (
              <>
                <Divider />
                <Typography variant="h5">
                  Raw Type Definition{" "}
                  <Typography fontSize={12}>
                    (from <InlineCode>{TYPES_JSON_FILENAME}</InlineCode>)
                  </Typography>
                </Typography>
                <Code value={typeString} />
              </>
            ) : isLoading ? null : (
              callout
            )}
          </Stack>

          {numberSearch > 0 ? (
            <>
              <Divider orientation="vertical" sx={{ minWidth: 10 }} />

              <Stack gap={1}>
                <Typography variant="h5" gutterBottom>
                  Types Relations
                </Typography>
                <TypeRelationsContent
                  resolvedType={typeRegistry[numberSearch]}
                />
              </Stack>
            </>
          ) : null}
        </Stack>
      </Stack>
    </Box>
  );
};
