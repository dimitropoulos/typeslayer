import {
	FiberManualRecord,
	FindInPage,
	KeyboardArrowDown,
	KeyboardArrowRight,
} from "@mui/icons-material";
import {
	Box,
	Button,
	IconButton,
	Stack,
	Typography,
	type TypographyVariant,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import type { ResolvedType, TypeRegistry } from "@typeslayer/validate";
import { type FC, useCallback, useEffect, useState } from "react";
import { theme } from "../theme";
import { TypeSummary } from "./type-summary";
import { friendlyPath } from "./utils";

// Type guard for Location objects coming from backend serialization
function isLocation(v: unknown): v is {
	path: string;
	start: { line: number; character: number };
	end?: { line: number; character: number };
} {
	if (!v || typeof v !== "object") return false;
	const loc = v as Record<string, unknown>;
	if (typeof loc.path !== "string") return false;
	const start = loc.start as Record<string, unknown> | undefined;
	if (!start || typeof start !== "object") return false;
	return typeof start.line === "number" && typeof start.character === "number";
}

export const DisplayRecursiveType: FC<{
	id: number;
	typeRegistry: TypeRegistry;
	depth?: number;
}> = ({ id, typeRegistry, depth = 0 }) => {
	const [expanded, setExpanded] = useState(true);
	const [displayLimit, setDisplayLimit] = useState(500);

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

	const noChildren = (
		[
			"BooleanLiteral",
			"StringLiteral",
			"BigIntLiteral",
			"NumberLiteral",
			"Any",
			"Undefined",
			"Null",
			"Never",
			"Unknown",
			"Number",
			"String",
			"Boolean",
			"BigInt",
			"ESSymbol",
			"NonPrimitive",
		] as const
	).some((flag) => flags.includes(flag));

	const TwiddlyGuy = noChildren
		? FiberManualRecord
		: expanded
			? KeyboardArrowDown
			: KeyboardArrowRight;

	return (
		<Stack gap={1} direction="row">
			<TwiddlyGuy
				onClick={noChildren ? undefined : toggleExpanded}
				sx={
					noChildren
						? {
								cursor: "default",
								fontSize: "0.5rem",
								alignSelf: "center",
								color: theme.palette.text.secondary,
								mx: 1,
							}
						: {
								cursor: "pointer",
								fontSize: undefined,
							}
				}
			/>
			<Stack>
				<TypeSummary
					showFlags
					onClick={noChildren ? undefined : toggleExpanded}
					resolvedType={resolvedType}
				/>
				{expanded && !noChildren && (
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
											<code>
												{typeof value === "string"
													? value.split("\\").join("")
													: String(value)}
											</code>
										</Box>
									);
								}

								//
								//  Locations
								//
								case "firstDeclaration":
								case "destructuringPattern":
								case "referenceLocation": {
									if (isLocation(value)) {
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
									return null;
								}

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

									const cutoff = 500;
									const currentLimit = Math.min(displayLimit, value.length);
									const hasMore = value.length > currentLimit;
									const remaining = value.length - currentLimit;

									const val = (
										<Stack gap={1} key={reactKey} sx={{ py: 1 }}>
											{value.slice(0, currentLimit).map((v, i) => (
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
											{hasMore && (
												<Stack
													direction="row"
													gap={2}
													alignItems="center"
													sx={{ px: 2, pl: 0, mb: 2 }}
												>
													<Typography>
														showing {currentLimit.toLocaleString()} out of{" "}
														{value.length.toLocaleString()}
													</Typography>
													<Button
														variant="outlined"
														size="small"
														onClick={() =>
															setDisplayLimit((prev) => prev + cutoff)
														}
													>
														Show {Math.min(cutoff, remaining).toLocaleString()}{" "}
														more
													</Button>
												</Stack>
											)}
										</Stack>
									);
									return (
										<Stack key={reactKey}>
											<Stack display="inline">
												<Typography display="inline">{key}: </Typography>
												<Typography display="inline" color="textDisabled">
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
	const [simplifyPaths, setSimplifyPaths] = useState(false);
	const [projectRoot, setProjectRoot] = useState<string | undefined>(undefined);
	const findInPage = useCallback(async () => {
		try {
			// Prefer opening in VS Code via backend; include line/char if present
			const goto =
				line !== undefined && character !== undefined
					? `${absolutePath}:${line}:${character}`
					: absolutePath;
					console.log("Opening file via backend:", goto);
			await invoke("open_file", { path: goto });
		} catch (e) {
			console.error("Failed to open file via backend", e);
		}
	}, [absolutePath, line, character]);

	// Load settings and project root
	useEffect(() => {
		(async () => {
			try {
				const s: { simplifyPaths?: boolean } = await invoke("get_settings");
				setSimplifyPaths(!!s?.simplifyPaths);
			} catch {}
			try {
				const root: string = await invoke("get_project_root");
				setProjectRoot(root);
			} catch {}
		})();
	}, []);

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
