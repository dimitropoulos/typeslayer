import {
	FindInPage,
	KeyboardArrowDown,
	KeyboardArrowRight,
} from "@mui/icons-material";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import type { ResolvedType, TypeRegistry } from "@typeslayer/validate";
import { type FC, useCallback, useState } from "react";
import { theme } from "../theme";
import { trpc } from "../trpc";
import { displayPath } from "./utils";
import { TypeSummary } from "./type-summary";

export const DisplayRecursiveType: FC<{
	id: number;
	typeRegistry: TypeRegistry;
	depth?: number;
	simplifyPaths: boolean;
}> = ({ id, typeRegistry, depth = 0, simplifyPaths }) => {
	if (!typeRegistry) {
		return <div>[Missing Data]</div>;
	}

	const resolvedType = typeRegistry.get(id);
	const [expanded, setExpanded] = useState(true);

	const marginLeft = depth * 16;

	if (!resolvedType) {
		return <div style={{ marginLeft }}>[Missing Node {id}]</div>;
	}

	const { flags } = resolvedType;

	const toggleExpanded = () => setExpanded((expanded) => !expanded);

	const TwiddlyGuy = expanded ? KeyboardArrowDown : KeyboardArrowRight;

	return (
		<Stack gap={1} direction="row">
			<TwiddlyGuy onClick={toggleExpanded} sx={{ cursor: "pointer" }} />
			<Stack>
				<TypeSummary showFlags onClick={toggleExpanded} resolvedType={resolvedType} />
				{expanded && (
					<Stack gap={1}>
						{(
							Object.entries(resolvedType) as [
								keyof ResolvedType,
								ResolvedType[keyof ResolvedType],
							][]
						).map(([key, value]) => {
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
												padding: 1,
												border: `1px solid ${theme.palette.divider}`,
											}}
											key={key}
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
													key={key}
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
											<Stack key={key} direction="row" gap={1}>
												{key}: <em>none</em>
											</Stack>
										);
									}

									const itsReallyFuckingBig = value.length > 2000;

									const val = (
										<Stack gap={1} key={key}>
											{(value.slice(0, value.length > 2000 ? 2000 : value.length)).map((v) => (
												<DisplayRecursiveType
													key={v}
													id={v as number}
													typeRegistry={typeRegistry}
													depth={depth + 2}
													simplifyPaths={simplifyPaths}
												/>
											))}
											{itsReallyFuckingBig && (
												<Stack>
													<Typography variant="caption" color="text.secondary">
														...and {value.length - 2000} more...
													</Typography>
												</Stack>
											)}
										</Stack>
									);
									return (
										<Stack key={key}>
											{key}:{val}
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
			<Typography>
				{displayPath(absolutePath, cwd, simplifyPaths)}:{line}:{character}
			</Typography>
		</Stack>
	);
}
