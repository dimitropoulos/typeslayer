import {
  Box,
  Divider,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "@tanstack/react-router";
import { InlineCode, panelBackground } from "@typeslayer/common";
import { TYPES_JSON_FILENAME } from "@typeslayer/validate";
import { useEffect, useState } from "react";
import { Callout } from "../components/callout";
import { CenterLoader } from "../components/center-loader";
import { Code } from "../components/code";
import { DisplayRecursiveType } from "../components/display-recursive-type";
import { StatPill } from "../components/stat-pill";
import { TypeRelationsContent } from "../components/type-relations";
import { useGetAppStats, useGetResolvedTypeById } from "../hooks/tauri-hooks";

export const SearchTypes = () => {
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const typeIdParam = params.typeId as string | undefined;
  const { data: appStats } = useGetAppStats();
  const [search, setSearch] = useState(typeIdParam || "");

  // Sync search with URL param
  useEffect(() => {
    if (typeIdParam && typeIdParam !== search) {
      setSearch(typeIdParam);
    }
  }, [typeIdParam, search]);

  const numberSearch = Number.parseInt(search, 10);

  const { data: resolvedType, isLoading } =
    useGetResolvedTypeById(numberSearch);

  const typeString = JSON.stringify(resolvedType, null, 2);

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

  const validSearch =
    numberSearch > 0 && !Number.isNaN(numberSearch) && resolvedType;

  return (
    <Box sx={{ pl: 4, pr: 3, overflowY: "scroll", maxHeight: "100%" }}>
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
        {appStats ? (
          <StatPill label="Types" value={appStats.typesCount} />
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
            <Stack>
              <Typography variant="h5">Type Definition</Typography>

              <Typography fontSize={12}>
                {" "}
                <Link
                  underline="hover"
                  color="inherit"
                  sx={{ fontWeight: "normal" }}
                  href="/type-graph"
                >
                  (recursively expanded)
                </Link>
              </Typography>
            </Stack>
            {isLoading ? (
              <CenterLoader />
            ) : validSearch ? (
              <Box
                sx={{
                  backgroundColor: panelBackground,
                  border: 1,
                  borderColor: "divider",
                  p: 2,
                  overflowY: "auto",
                }}
              >
                <DisplayRecursiveType id={numberSearch} />
              </Box>
            ) : null}

            {typeString && validSearch ? (
              <>
                <Divider />
                <Typography variant="h5">
                  Raw Type Definition{" "}
                  <Typography fontSize={12}>
                    <Link
                      underline="hover"
                      color="inherit"
                      sx={{ fontWeight: "normal" }}
                      href="/raw-data/types"
                    >
                      (from <InlineCode>Raw Data</InlineCode>{" "}
                      <InlineCode>|</InlineCode>{" "}
                      <InlineCode>{TYPES_JSON_FILENAME}</InlineCode>)
                    </Link>
                  </Typography>
                </Typography>
                <Code value={typeString} />
              </>
            ) : isLoading ? null : (
              callout
            )}
          </Stack>

          <Stack
            sx={{
              flexGrow: 1,
              overflow: "auto",
              mb: 1,
              gap: 3,
            }}
          >
            {validSearch ? (
              <>
                <Stack>
                  <Typography variant="h5">Types Relations</Typography>

                  <Typography fontSize={12}>
                    {" "}
                    <Link
                      underline="hover"
                      color="inherit"
                      sx={{ fontWeight: "normal" }}
                      href="/type-graph"
                    >
                      (from <InlineCode>Type Graph</InlineCode>)
                    </Link>
                  </Typography>
                </Stack>
                <TypeRelationsContent typeId={resolvedType.id} />
              </>
            ) : null}
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
};
