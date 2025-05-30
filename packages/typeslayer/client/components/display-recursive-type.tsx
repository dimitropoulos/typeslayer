import {
	FindInPage,
	KeyboardArrowDown,
	KeyboardArrowRight,
} from "@mui/icons-material";
import {
	Box,
	IconButton,
	Stack,
	Typography,
	type TypographyVariant,
} from "@mui/material";
import type { ResolvedType, TypeRegistry } from "@typeslayer/validate";
import { type FC, useCallback, useState } from "react";
import { theme } from "../theme";
import { trpc } from "../trpc";
import { TypeSummary } from "./type-summary";
import { friendlyPath } from "./utils";

export const DisplayRecursiveType: FC<{
	id: number;
	typeRegistry: TypeRegistry;
	depth?: number;
}> = ({ id, typeRegistry, depth = 0 }) => {
	const [expanded, setExpanded] = useState(true);

	if (!typeRegistry) {
		return <Box>[Missing Data]</Box>;
	}

	if (Number.isNaN(id)) {
		return null;
	}

	if (depth > 10) {
		return (
			<Box style={{ marginLeft: depth * 16 }}>
				[TypeSlayer Recursion limit reached for type {id}]
			</Box>
		);
	}

	const resolvedType = typeRegistry.get(id);

	const marginLeft = depth * 16;

	if (!resolvedType) {
		return <Box style={{ marginLeft }}>[Missing Node: {id}]</Box>;
	}

	const { flags } = resolvedType;

	const toggleExpanded = () => setExpanded((expanded) => !expanded);

	const TwiddlyGuy = expanded ? KeyboardArrowDown : KeyboardArrowRight;

	return (
		<Stack gap={1} direction="row">
			<TwiddlyGuy onClick={toggleExpanded} sx={{ cursor: "pointer" }} />
			<Stack>
				<TypeSummary
					showFlags
					onClick={toggleExpanded}
					resolvedType={resolvedType}
				/>
				{expanded && (
					<Stack gap={1}>
						{(
							Object.entries(resolvedType) as [
								keyof ResolvedType,
								ResolvedType[keyof ResolvedType],
							][]
						).map(([key, value], index) => {
							const reactKey = `${id}:${key}:${index}`;

							switch (key) {
								//
								//  Skip these
								//
								case "id":
								case "flags":
								case "recursionId":
								case "symbolName":
								case "intrinsicName":
									return null;

								//
								//  display
								//
								case "display": {
									if (typeof value !== "string") {
										throw new Error(
											`Expected display to be a string, got ${typeof value}`,
										);
									}

									const skipThese = [
										"BooleanLiteral",
										"StringLiteral",
										"BigIntLiteral",
										"NumberLiteral",
									] as const;

									if (skipThese.some((flag) => flags.includes(flag))) {
										return null;
									}

									return (
										<Box
											sx={{
												background: theme.palette.grey[900],
												borderRadius: 1,
												px: 1,
												py: 0.5,
												border: `1px solid ${theme.palette.divider}`,
												alignSelf: "flex-start",
											}}
											key={reactKey}
										>
											<code>{value.replaceAll("\\", "")}</code>
										</Box>
									);
								}

								//
								//  Locations
								//
								case "firstDeclaration":
								case "destructuringPattern":
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
													key={reactKey}
													title={`${key}:`}
													absolutePath={value.path}
													line={value.start.line}
													character={value.start.character}
												/>
											);
										}
									}
									throw new Error(
										`Expected firstDeclaration to be an object, got ${typeof value}`,
									);

								//
								//  TypeId
								//
								case "instantiatedType":
								case "substitutionBaseType":
								case "constraintType":
								case "indexedAccessObjectType":
								case "indexedAccessIndexType":
								case "conditionalCheckType":
								case "conditionalExtendsType":
								case "conditionalTrueType":
								case "conditionalFalseType":
								case "keyofType":
								case "evolvingArrayElementType":
								case "evolvingArrayFinalType":
								case "reverseMappedSourceType":
								case "reverseMappedMappedType":
								case "reverseMappedConstraintType":
								case "aliasType":
									if (value === id) {
										return null;
									}

									if (typeof value === "number") {
										return (
											<Stack key={reactKey}>
												{key}:
												<DisplayRecursiveType
													id={value}
													typeRegistry={typeRegistry}
													depth={depth + 2}
												/>
											</Stack>
										);
									}
									throw new Error(
										`Expected instantiatedType to be a number, got ${typeof value}`,
									);

								//
								//  TypeId[]
								//
								case "aliasTypeArguments":
								case "intersectionTypes":
								case "typeArguments":
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
										return (
											<Stack key={reactKey} direction="row" gap={1}>
												{key}: <em>none</em>
											</Stack>
										);
									}

									const cutoff = 3000;
									const itsReallyFuckingBig = value.length > cutoff;

									const val = (
										<Stack gap={1} key={reactKey}>
											{value
												.slice(0, value.length > cutoff ? cutoff : value.length)
												.map((v, i) => (
													<DisplayRecursiveType
														key={`${reactKey}:${
															// biome-ignore lint/suspicious/noArrayIndexKey: the sort order is stable and we don't have any other information to use since you can do `string | string | string`, for example.
															i
														}`}
														id={v as number}
														typeRegistry={typeRegistry}
														depth={depth + 2}
													/>
												))}
											{itsReallyFuckingBig && (
												<Typography sx={{ px: 2, pl: 0, mb: 2 }}>
													...and {(value.length - cutoff).toLocaleString()}{" "}
													more...
												</Typography>
											)}
										</Stack>
									);
									return (
										<Stack key={reactKey}>
											<Stack display="inline">
												<Typography display="inline">{key}: </Typography>
												<Typography
													display="inline"
													fontSize="0.8em"
													color="textDisabled"
												>
													{value.length.toLocaleString()}
												</Typography>
											</Stack>
											{val}
										</Stack>
									);
								}

								// really not sure what the best way to handle this and why it's not a flag like everything else
								case "isTuple":
									return null;

								default:
									key satisfies never;
									throw new Error(`Unexpected property ${key} in type ${id}`);
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
	title,
	pathVariant = "body1",
}: {
	absolutePath: string;
	line?: number;
	character?: number;
	title?: string;
	pathVariant?: TypographyVariant;
}) {
	const {
		data: { simplifyPaths = false } = {},
	} = trpc.getSettings.useQuery();
	const { mutateAsync: openFile } = trpc.openFile.useMutation();
	const { data: projectRoot } = trpc.getProjectRoot.useQuery();

	const findInPage = useCallback(async () => {
		await openFile({
			path: absolutePath,
			line,
			character,
		});
	}, [openFile, absolutePath, line, character]);

	const lineChar =
		line !== undefined && character !== undefined
			? `:${line}:${character}`
			: "";

	const exactLocation = `${friendlyPath(absolutePath, projectRoot, simplifyPaths)}${lineChar}`;

	return (
		<Stack direction="row" alignItems={"center"} gap={1} key={exactLocation}>
			{title ? <Typography>{title}</Typography> : null}
			<IconButton size="small" onClick={findInPage} sx={{ p: 0 }}>
				<FindInPage />
			</IconButton>
			<Typography variant={pathVariant}>{exactLocation}</Typography>
		</Stack>
	);
}
