import {
	Box,
	Divider,
	FormControl,
	FormControlLabel,
	FormGroup,
	FormLabel,
	Stack,
	Switch,
	TextField,
	Typography,
} from "@mui/material";
import type { TypeRegistry } from "@typeslayer/validate";
import { useState } from "react";
import { Callout } from "../components/callout";
import { DisplayRecursiveType } from "../components/display-recursive-type";
import { InlineCode } from "../components/inline-code";
import { theme } from "../theme";
import { trpc } from "../trpc";

export const SearchTypes = () => {
	const [search, setSearch] = useState("");

	const numberSearch = Number.parseInt(search, 10);

	const { data: typeRegistryEntries } = trpc.getTypeRegistry.useQuery();
	const typeRegistry: TypeRegistry = new Map(typeRegistryEntries ?? []);

	const [simplifyPaths, setSimplifyPaths] = useState(true);
	const handleSimplifyPaths = (event: React.ChangeEvent<HTMLInputElement>) => {
		setSimplifyPaths(event.target.checked);
	};

	const typeString = JSON.stringify(typeRegistry.get(numberSearch), null, 2);

	return (
		<Box sx={{ m: 4 }}>
			<Stack direction="row" gap={5} alignItems="center">
				<Stack direction="row" alignItems="baseline" gap={1}>
					<h1>Search</h1>
					<Typography color="textDisabled">
						{typeRegistry.size.toLocaleString()} types
					</Typography>
				</Stack>
			</Stack>
			<Stack gap={3}>
				<Stack
					direction="row"
					gap={3}
					divider={<Divider orientation="vertical" flexItem />}
					alignItems="center"
				>
					<TextField
						label="Search by Type Id"
						placeholder="type id"
						variant="outlined"
						type="number"
						sx={{ input: { color: theme.palette.primary.main }, width: 600 }}
						value={search}
						onChange={(event) => {
							setSearch(event.target.value);
						}}
					/>
					<FormGroup>
						<FormControlLabel
							label="Simplify Paths"
							control={
								<Switch
									checked={simplifyPaths}
									onChange={handleSimplifyPaths}
								/>
							}
						/>
					</FormGroup>
				</Stack>

				<DisplayRecursiveType
					id={numberSearch}
					typeRegistry={typeRegistry}
					simplifyPaths={simplifyPaths}
				/>

				{typeString ? (
					<>
						<Divider />
						<code style={{ whiteSpace: "pre" }}>{typeString}</code>
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
