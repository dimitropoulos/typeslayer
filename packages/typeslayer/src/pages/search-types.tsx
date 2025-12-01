import { Box, Divider, Stack, TextField, Typography } from "@mui/material";
import { useNavigate, useParams } from "@tanstack/react-router";
import type { ResolvedType } from "@typeslayer/validate";
import { useEffect, useState } from "react";
import { Callout } from "../components/callout";
import { DisplayRecursiveType } from "../components/display-recursive-type";
import { InlineCode } from "../components/inline-code";
import { useTypesJson } from "../hooks/tauri-hooks";

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

	const typesJson = useTypesJson();

	const typeRegistry = new Map<number, ResolvedType>(
		((typesJson.data ?? []) as ResolvedType[]).map((t) => [t.id, t]),
	);

	const typeString = JSON.stringify(typeRegistry.get(numberSearch), null, 2);

	return (
		<Box sx={{ px: 4, overflowY: "auto", height: "100%" }}>
			<Stack direction="row" gap={5} alignItems="center">
				<Stack direction="row" alignItems="baseline" gap={1}>
					<h1>Search</h1>
					<Typography color="textDisabled">
						{typeRegistry.size.toLocaleString()} types
					</Typography>
				</Stack>
			</Stack>
			<Stack gap={3}>
				<TextField
					placeholder="search by type id"
					variant="outlined"
					type="number"
					sx={{ width: 600 }}
					value={search}
					onChange={(event) => {
						const newValue = event.target.value;
						setSearch(newValue);
						if (newValue) {
							navigate({ to: `/search-types/${newValue}` });
						} else {
							navigate({ to: "/search-types" });
						}
					}}
				/>

				<DisplayRecursiveType id={numberSearch} typeRegistry={typeRegistry} />

				{typeString ? (
					<>
						<Divider />
						<Typography variant="h6">Raw Type Definition</Typography>
						<code
							style={{
								whiteSpace: "pre",
								background: "#050505",
								border: "1px solid #333",
								padding: "8px",
								overflowY: "hidden",
								overflowX: "scroll",
								marginBottom: 24,
							}}
						>
							{typeString}
						</code>
					</>
				) : (
					<Callout title="What is this?">
						<Typography>
							During typechecking, the TypeScript compiler assigns a unique{" "}
							<InlineCode>id</InlineCode> to every type it encounters. To
							interact with the TypeSlayer, you'll find yourself using these
							identifiers a lot.
						</Typography>
						<Typography>
							This may seem like an annoying detail, and you may be wondering
							why you can't just search by name. But consider that actually most
							types anonymous, and don't even have names.
						</Typography>
						<Typography>
							Also, as strange as this may sound, almost every TypeScript
							codebase has many distinct types that share the same name.
							Consider a codebase that names generic parameters{" "}
							<InlineCode>T</InlineCode>. The TypeScript compiler will assign a
							different <InlineCode>id</InlineCode> to each of these types, even
							though they all have the same name.
						</Typography>
					</Callout>
				)}
			</Stack>
		</Box>
	);
};
