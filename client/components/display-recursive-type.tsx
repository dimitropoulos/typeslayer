import { useCallback, useState, type FC } from "react";
import type { TypesJson } from "../../server/enhance-trace";
import {
	FindInPage,
	KeyboardArrowDown,
	KeyboardArrowRight,
} from "@mui/icons-material";
import { Box, Chip, IconButton, Stack, Typography } from "@mui/material";
import { trpc } from "../trpc";
import { displayPath } from "./utils";
import { theme } from "../theme";

export const DisplayRecursiveType: FC<{
	id: number;
	typeRegistry: Map<number, TypesJson>;
	depth?: number;
	simplifyPaths: boolean;
}> = ({ id, typeRegistry, depth = 0, simplifyPaths }) => {
	if (!typeRegistry) {
		return <div>[Missing Data]</div>;
	}

	const typesJson = typeRegistry.get(id);
	const [expanded, setExpanded] = useState(true);

	const marginLeft = depth * 16;

	if (!typesJson) {
		return <div style={{ marginLeft }}>[Missing Node {id}]</div>;
	}

	const { flags } = typesJson;

	const toggleExpanded = () => setExpanded((expanded) => !expanded);

	let humanReadable = "<anonymous>";
	if ("symbolName" in typesJson && typeof typesJson.symbolName === "string") {
		humanReadable = typesJson.symbolName;
	} else if (
		"intrinsicName" in typesJson &&
		typeof typesJson.intrinsicName === "string"
	) {
		humanReadable = typesJson.intrinsicName;
	} else if (
		flags.length === 1 &&
		flags[0] === "StringLiteral" &&
		typeof typesJson.display === "string"
	) {
		humanReadable = typesJson.display;
	} else if (
		flags.length === 1 &&
		flags[0] === "NumberLiteral" &&
		typeof typesJson.display === "string"
	) {
		humanReadable = typesJson.display;
	}

	const TwiddlyGuy = expanded ? KeyboardArrowDown : KeyboardArrowRight;

	return (
		<Stack gap={1} direction="row">
			<TwiddlyGuy onClick={toggleExpanded} sx={{ cursor: "pointer" }} />
			<Stack>
				<Stack
					direction="row"
					gap={1}
					onClick={toggleExpanded}
					sx={{ cursor: "pointer" }}
				>
					<Typography color="secondary" sx={{ fontFamily: "monospace" }}>
						{humanReadable}
					</Typography>
					<Typography color="primary" sx={{ fontFamily: "monospace" }}>
						{id}
					</Typography>
					{flags.map((flag) => (
						<Chip variant="filled" key={flag} label={flag} size="small" />
					))}
				</Stack>

				{expanded && (
					<Stack gap={1}>
						{Object.entries(typesJson).map(([key, value]) => {
							switch (key) {
								case "id":
								case "flags":
								case "recursionId":
								case "symbolName":
								case "intrinsicName":
									return null;
								case "display":
									if (typeof value !== "string") {
										throw new Error(
											`Expected display to be a string, got ${typeof value}`,
										);
									}
									if (
										(
											[
												"BooleanLiteral",
												"StringLiteral",
												"NumberLiteral",
											] as const
										).some((flag) => flags.includes(flag))
									) {
										return null;
									}

									return (
										<Box
											sx={{
												background: theme.palette.grey[900],
												borderRadius: 1,
												padding: 1,
												border: `1px solid ${theme.palette.divider}`,
											}}
											key={key}
										>
											<code>{value.replaceAll("\\", "")}</code>
										</Box>
									);

								case "firstDeclaration":
								case "referenceLocation":
									{
										if (
											typeof value === "object" &&
											"path" in value &&
											typeof value.path === "string" &&
											"start" in value &&
											typeof value.start === "object"
										) {
											return (
												<OpenFile
													title={key}
													absolutePath={value.path}
													line={value.start.line}
													character={value.start.character}
													simplifyPaths={simplifyPaths}
												/>
											);
										}
									}
									throw new Error(
										`Expected firstDeclaration to be an object, got ${typeof value}`,
									);

								case "instantiatedType":
								case "indexedAccessObjectType":
								case "indexedAccessIndexType":
								case "conditionalCheckType":
								case "conditionalExtendsType":
									if (value === id) {
										return null;
									}

									if (typeof value === "number") {
										return (
											<Stack key={key}>
												{key}:
												<DisplayRecursiveType
													key={key}
													id={value}
													typeRegistry={typeRegistry}
													depth={depth + 2}
													simplifyPaths={simplifyPaths}
												/>
											</Stack>
										);
									}
									throw new Error(
										`Expected instantiatedType to be a number, got ${typeof value}`,
									);

								case "typeArguments":
								case "aliasTypeArguments":
								case "unionTypes": {
									if (!Array.isArray(value)) {
										throw new Error(
											`Expected unionTypes to be an array, got ${typeof value}`,
										);
									}
									if (!value.every((v) => typeof v === "number")) {
										throw new Error(
											`Expected all values in unionTypes to be numbers, got ${value
												.map((v) => typeof v)
												.join(", ")}`,
										);
									}
									if (value.length === 0) {
										return <Stack direction="row" gap={1}>{key}: <em>none</em></Stack>
									}

									const val = (
										<Stack gap={1} key={key}>
											{value.map((v) => (
												<DisplayRecursiveType
													key={v}
													id={v as number}
													typeRegistry={typeRegistry}
													depth={depth + 2}
													simplifyPaths={simplifyPaths}
												/>
											))}
										</Stack>
									);
									return (
										<Stack key={key}>
											{key}:{val}
										</Stack>
									);
								}

								default:
									return (
										<Stack key={key}>
											{key}: {JSON.stringify(value)}
										</Stack>
									);
							}
						})}
					</Stack>
				)}
			</Stack>
		</Stack>
	);
};

export function OpenFile({
	absolutePath,
	line,
	character,
	simplifyPaths,
	title,
}: {
	absolutePath: string;
	simplifyPaths: boolean;
	line?: number;
	character?: number;
	title: string;
}) {
	const { mutateAsync: openFile } = trpc.openFile.useMutation();

	const { data: cwd } = trpc.getCWD.useQuery();
	const findInPage = useCallback(async () => {
		await openFile({
			path: absolutePath,
			line,
			character,
		});
	}, [openFile, absolutePath, line, character]);

	return (
		<Stack direction="row" alignItems={"center"} gap={1} key={absolutePath}>
			<Typography>{title}:</Typography>
			<IconButton size="small" onClick={findInPage} sx={{ p: 0 }}>
				<FindInPage />
			</IconButton>
			<Typography>{displayPath(absolutePath, cwd, simplifyPaths)}:{line}:{character}</Typography>
		</Stack>
	);
}
