import {
	Box,
	Divider,
	FormControl,
	FormLabel,
	Stack,
	Switch,
	TextField,
} from "@mui/material";
import { useState } from "react";
import type { TypesJson } from "../../server/enhance-trace";
import { DisplayRecursiveType } from "../components/display-recursive-type";
import { trpc } from "../trpc";

export const SearchTypes = () => {
	const [search, setSearch] = useState("72");

	const numberSearch = Number.parseInt(search, 10);

	const { data: typeRegistryEntries } = trpc.getTypeRegistry.useQuery();

	const typeRegistry = new Map<number, TypesJson>(typeRegistryEntries ?? []);

	const [simplifyPaths, setSimplifyPaths] = useState(true);
	const handleSimplifyPaths = (event: React.ChangeEvent<HTMLInputElement>) => {
		setSimplifyPaths(event.target.checked);
	};

	const typeString =
		JSON.stringify(typeRegistry.get(numberSearch), null, 2) ?? "no data";

	return (
		<Box sx={{ m: 4 }}>
			<Stack direction="row" gap={5} alignItems="center">
				<h1>Search</h1>

				<FormControl sx={{ align: "center" }}>
					<FormLabel>Simplify Paths</FormLabel>
					<Switch checked={simplifyPaths} onChange={handleSimplifyPaths} />
				</FormControl>
			</Stack>
			<Stack gap={3}>
				<TextField
					label="Search Types By Id"
					placeholder="Enter type id"
					variant="outlined"
					type="number"
					value={search}
					onChange={(event) => {
						setSearch(event.target.value);
					}}
				/>

				<DisplayRecursiveType
					id={numberSearch}
					typeRegistry={typeRegistry}
					simplifyPaths={simplifyPaths}
				/>

				<Divider />

				<code style={{ whiteSpace: "pre" }}>{typeString}</code>
			</Stack>
		</Box>
	);
};
