import {
	CopyAll,
	Diversity1,
	EmojiEvents,
	FindInPage,
	GroupAdd,
	JoinFull,
	JoinInner,
	Lightbulb,
	SafetyDivider,
	SportsKabaddi,
	Whatshot,
} from "@mui/icons-material";
import {
	Box,
	Divider,
	IconButton,
	List,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	ListSubheader,
	Stack,
	Typography,
} from "@mui/material";
import type {
	EventChecktypes__InstantiateType_DepthLimit,
	EventChecktypes__RecursiveTypeRelatedTo_DepthLimit,
	EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit,
	ResolvedType,
	TypeRegistry,
} from "@typeslayer/validate";
import { type ReactNode, useCallback, useState } from "react";
import { Callout } from "../components/callout";
import { DisplayRecursiveType } from "../components/display-recursive-type";
import { InlineCode } from "../components/inline-code";
import { TypeSummary } from "../components/type-summary";
import { extractPath, friendlyPackageName } from "../components/utils";
import { theme } from "../theme";
import { trpc } from "../trpc";

type AwardId = keyof typeof awards;

const awards = {
	hotSpots: {
		title: "Hot Spots",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: Whatshot,
	},
	unionTypes: {
		title: "Largest Union",
		property: "unionTypes",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: JoinFull,
		unit: "union members",
	},
	duplicatePackages: {
		title: "Duplicate Packages",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: CopyAll,
	},
	typeArguments: {
		title: "Most Type Arguments",
		property: "typeArguments",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: SportsKabaddi,
		unit: "type arguments",
	},
	intersectionTypes: {
		title: "Largest Intersection",
		property: "intersectionTypes",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: JoinInner,
		unit: "intersections",
	},
	aliasTypeArguments: {
		title: "Alias Type Arguments",
		property: "aliasTypeArguments",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: GroupAdd,
		unit: "aliased type arguments",
	},
	limit_instantiateType: {
		title: "Type Instantiation Limit",
		property: "limit_instantiateType",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: Lightbulb,
	},
	limit_recursiveTypeRelatedTo: {
		title: "Recursive Relations Limit",
		property: "limit_recursiveTypeRelatedTo",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: Diversity1,
	},
	limit_typeRelatedToDiscriminatedType: {
		title: "Discrimination Limit",
		property: "limit_typeRelatedToDiscriminatedType",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: SafetyDivider,
	},
} as const;

export const RenderAward = ({
	activeAward,
	setActiveAward,
	awardId,
}: {
	activeAward: AwardId | null;
	setActiveAward: (award: AwardId) => void;
	awardId: AwardId;
}) => {
	const { title, icon: Icon } = awards[awardId];
	const onClick = useCallback(
		() => setActiveAward(awardId),
		[awardId, setActiveAward],
	);
	const selected = activeAward === awardId;
	const color = selected ? { color: theme.palette.primary.dark } : {};
	return (
		<ListItemButton
			key={awardId}
			selected={selected}
			sx={{
				borderRadius: 2,
				...color,
			}}
			onClick={onClick}
		>
			<ListItemIcon sx={{ minWidth: 38 }}>
				<Icon sx={{ ...color }} />
			</ListItemIcon>
			<ListItemText primary={title} />
		</ListItemButton>
	);
};

export const RenderPlayground = ({
	activeAward,
	typeRegistry,
}: {
	activeAward: AwardId | null;
	typeRegistry: TypeRegistry;
}) => {
	switch (activeAward) {
		case "typeArguments":
			return (
				<ArrayAward typeRegistry={typeRegistry} {...awards.typeArguments} />
			);
		case "unionTypes":
			return <ArrayAward typeRegistry={typeRegistry} {...awards.unionTypes} />;
		case "intersectionTypes":
			return (
				<ArrayAward typeRegistry={typeRegistry} {...awards.intersectionTypes} />
			);
		case "aliasTypeArguments":
			return (
				<ArrayAward
					typeRegistry={typeRegistry}
					{...awards.aliasTypeArguments}
				/>
			);
		case "duplicatePackages":
			return <DuplicatePackages />;
		case "hotSpots":
			return <ShowHotSpots />;

		case "limit_instantiateType":
			return (
				<ShowTypeLimit<EventChecktypes__InstantiateType_DepthLimit>
					key={awards.limit_instantiateType.title}
					notFound={{
						title: "No Type Instantiation Limits Found",
						description:
							"No type instantiation limits detected. Did you run analyze-trace?",
					}}
					title={awards.limit_instantiateType.title}
					subtitle={(first) =>
						`The most complex types that were limited by the type system.\nThe current limit is set to ${first.args.instantiationCount.toLocaleString()}, and every type shown below hit that limit.`
					}
					typeRegistry={typeRegistry}
					rpc={trpc.getTypeInstantiationLimits}
					icon={awards.limit_instantiateType.icon}
					inlineBarGraph={(current, first) => (
						<InlineBarGraph
							label={`${current.args.instantiationDepth.toLocaleString()} depth`}
							width={`${(current.args.instantiationDepth / first.args.instantiationDepth) * 100}%`}
						/>
					)}
					getKey={(current) =>
						`${current.args.typeId}-${current.args.instantiationCount}-${current.args.instantiationDepth}:${current.ts}`
					}
					getTypeId={(current) => current.args.typeId}
				/>
			);
		case "limit_recursiveTypeRelatedTo":
			return (
				<ShowTypeLimit<EventChecktypes__RecursiveTypeRelatedTo_DepthLimit>
					key={awards.limit_recursiveTypeRelatedTo.title}
					notFound={{
						title: "No Recursive Relations Limits Found",
						description:
							"No recursive relations limits detected. Did you run analyze-trace?",
					}}
					title={awards.limit_recursiveTypeRelatedTo.title}
					subtitle={(first) =>
						`The most complex types that were limited by the type system.\nThe current limit is set to ${first.args.targetDepth.toLocaleString()}, and every type shown below hit that limit.`
					}
					typeRegistry={typeRegistry}
					rpc={trpc.getRecursiveTypeRelatedToLimits}
					icon={awards.limit_recursiveTypeRelatedTo.icon}
					inlineBarGraph={(current, first) => (
						<InlineBarGraph
							label={`${current.args.depth.toLocaleString()} depth`}
							width={`${(current.args.depth / first.args.depth) * 100}%`}
						/>
					)}
					getKey={(current) =>
						`${current.args.sourceId}-${current.args.sourceId}:${current.ts}`
					}
					getTypeId={(current) => current.args.sourceId}
				/>
			);

		case "limit_typeRelatedToDiscriminatedType":
			return (
				<ShowTypeLimit<EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit>
					key={awards.limit_typeRelatedToDiscriminatedType.title}
					notFound={{
						title: "No Discriminated Type Limits Found",
						description:
							"No discriminated type limits detected. Did you run analyze-trace?",
					}}
					title={awards.limit_typeRelatedToDiscriminatedType.title}
					subtitle={(first) =>
						`The most complex types that were limited by the type system.\nThe current limit is set to ${first.args.numCombinations.toLocaleString()}, and every type shown below hit that limit.`
					}
					typeRegistry={typeRegistry}
					rpc={trpc.getTypeRelatedToDiscriminatedTypeLimits}
					icon={awards.limit_typeRelatedToDiscriminatedType.icon}
					inlineBarGraph={(current, first) => (
						<InlineBarGraph
							label={`${current.args.numCombinations.toLocaleString()} depth`}
							width={`${(current.args.numCombinations / first.args.numCombinations) * 100}%`}
						/>
					)}
					getKey={(current) =>
						`${current.args.sourceId}-${current.args.targetId}:${current.ts}`
					}
					getTypeId={(current) => current.args.sourceId}
				/>
			);

		default:
			return <InfoBox />;
	}
};

export const AwardWinners = () => {
	const [activeAward, setActiveAward] = useState<AwardId | null>(
		"limit_recursiveTypeRelatedTo",
	);
	console.log({ activeAward });

	const { data: typeRegistryEntries } = trpc.getTypeRegistry.useQuery();
	const typeRegistry: TypeRegistry = new Map(typeRegistryEntries ?? []);
	window.typeRegistry = typeRegistry;

	return (
		<Stack
			direction="row"
			sx={{
				minWidth: 500,
				minHeight: 500,
				alignItems: "flex-start",
				flexGrow: 1,
			}}
		>
			<Stack
				sx={{
					px: 1,
					minWidth: 300,
					minHeight: "100%",
					backgroundColor: theme.palette.background.paper,
				}}
			>
				<List
					sx={{ width: "100%", maxWidth: 350 }}
					component="nav"
					subheader={<ListSubheader>Performance Metrics</ListSubheader>}
				>
					{(
						[
							"hotSpots",
							"limit_instantiateType",
							"limit_recursiveTypeRelatedTo",
							"limit_typeRelatedToDiscriminatedType",
						] as const
					).map((awardId) => (
						<RenderAward
							key={awardId}
							activeAward={activeAward}
							setActiveAward={setActiveAward}
							awardId={awardId}
						/>
					))}
				</List>

				<Divider />

				<List subheader={<ListSubheader>Type-level Metrics</ListSubheader>}>
					{(
						[
							"unionTypes",
							"intersectionTypes",
							"typeArguments",
							"aliasTypeArguments",
						] as const
					).map((awardId) => (
						<RenderAward
							key={awardId}
							activeAward={activeAward}
							setActiveAward={setActiveAward}
							awardId={awardId}
						/>
					))}
				</List>
				<Divider />

				<List subheader={<ListSubheader>Bundle Implications</ListSubheader>}>
					<RenderAward
						activeAward={activeAward}
						setActiveAward={setActiveAward}
						awardId={"duplicatePackages"}
					/>
				</List>
			</Stack>

			<Box
				sx={{
					p: 4,
					flexGrow: 1,
					maxWidth: "100%",
					maxHeight: "100%",
					overflow: "auto",
				}}
			>
				<RenderPlayground
					activeAward={activeAward}
					typeRegistry={typeRegistry}
				/>
			</Box>
		</Stack>
	);
};

function InfoBox() {
	return (
		<Stack sx={{ minWidth: 500, minHeight: 500 }}>
			<TitleSubtitle
				title="Award Winners"
				subtitle="A types-level Hall of Shame"
				icon={<EmojiEvents fontSize="large" />}
			/>
			<Callout title={"Find new record-breakers!"}>
				<Typography>
					You'll also notice that in <InlineCode>window</InlineCode> object in
					your console, there's a map called{" "}
					<InlineCode>typesRegistry</InlineCode> that's a{" "}
					<InlineCode>
						Map&lt;<InlineCode secondary>TypeId</InlineCode>,{" "}
						<InlineCode secondary>ResolvedType</InlineCode>&gt;
					</InlineCode>
					. Feel free to play with it to find more interesting record-breakers.
				</Typography>
				<Typography>
					Also, Ramda is available in the console as <InlineCode>R</InlineCode>,
					and Ramda-Adjunct is available as <InlineCode>RA</InlineCode>.{" "}
					<em>Long Live Functional Programming!</em>
				</Typography>
			</Callout>
		</Stack>
	);
}

function TitleSubtitle({
	title,
	subtitle,
	icon,
}: {
	title: string;
	subtitle: string;
	icon: ReactNode;
}) {
	return (
		<Stack sx={{ mb: 2, mr: 1 }} gap={1}>
			<Stack direction="row" gap={2} alignItems="center">
				{icon}
				<Typography variant="h4">{title}</Typography>
			</Stack>
			<Typography>{subtitle}</Typography>
		</Stack>
	);
}

function ArrayAward({
	title,
	description,
	property,
	icon: Icon,
	typeRegistry,
	unit,
}: {
	title: string;
	description: string;
	property:
		| typeof awards.unionTypes.property
		| typeof awards.typeArguments.property
		| typeof awards.intersectionTypes.property
		| typeof awards.aliasTypeArguments.property;
	icon: (typeof awards)[keyof typeof awards]["icon"];
	typeRegistry: TypeRegistry;
	unit: string;
}) {
	const [selectedIndex, setSelectedIndex] = useState(0);

	const handleListItemClick = (
		_event: React.MouseEvent<HTMLDivElement, MouseEvent>,
		index: number,
	) => {
		setSelectedIndex(index);
	};

	// sort typeRegistryEntries by ones that have the hightest number of unionTypes
	const sorted = Array.from(typeRegistry.values())
		.filter((resolvedType: ResolvedType) => property in resolvedType)
		.sort((a, b) => {
			const aAliasTypeArguments = a[property]?.length ?? 0;
			const bAliasTypeArguments = b[property]?.length ?? 0;
			return bAliasTypeArguments - aAliasTypeArguments;
		});

	const maxValue = sorted[0]?.[property]?.length ?? 0;

	const top = 100;

	return (
		<Stack direction="row" gap={2} alignItems="flex-start">
			<Stack sx={{ minWidth: 450, maxWidth: 450, mx: 1 }}>
				<TitleSubtitle
					title={title}
					subtitle={description}
					icon={<Icon fontSize="large" />}
				/>

				<Stack sx={{ my: 2 }}>
					<Typography variant="h5" sx={{ pl: 2, mt: 2 }}>
						Top {top}
					</Typography>
					<List>
						{sorted.slice(0, top).map(({ id }, index) => {
							const value = sorted[index][property]?.length ?? 0;
							return (
								<ListItemButton
									selected={index === selectedIndex}
									onClick={(event) => handleListItemClick(event, index)}
									key={id}
									sx={{
										width: "100%",
									}}
								>
									<ListItemText>
										<Stack sx={{ flexGrow: 1 }} gap={1}>
											<TypeSummary resolvedType={sorted[index]} />
											<Stack gap={0.5}>
												<InlineBarGraph
													label={`${value.toLocaleString()} ${unit}`}
													width={`${(value / maxValue) * 100}%`}
												/>
											</Stack>
										</Stack>
									</ListItemText>
								</ListItemButton>
							);
						})}
					</List>
				</Stack>
			</Stack>

			<Divider orientation="vertical" sx={{ mx: 2 }} />

			<DisplayRecursiveType
				id={sorted[selectedIndex]?.id ?? 0}
				typeRegistry={typeRegistry}
			/>
		</Stack>
	);
}

const DuplicatePackages = () => {
	const { data: duplicatePackages = [] } = trpc.getDuplicatePackages.useQuery();
	const Icon = awards.duplicatePackages.icon;
	return (
		<Stack>
			<TitleSubtitle
				title="Duplicate Packages"
				subtitle="packages that are duplicated in the bundle"
				icon={<Icon fontSize="large" />}
			/>

			<Stack gap={3} sx={{ ml: 1 }}>
				{duplicatePackages.map(({ instances, name }) => (
					<Stack key={name}>
						<Typography variant="h6" color="primary">
							{name}
						</Typography>

						<List sx={{ ml: 2 }}>
							{instances.map(({ path, version }) => (
								<ListItemButton
									key={path}
									sx={{
										width: "100%",
									}}
								>
									<Stack>
										<Typography color="secondary">v{version}</Typography>
										<Typography variant="caption" sx={{ mr: 2 }}>
											{path}
										</Typography>
									</Stack>
								</ListItemButton>
							))}
						</List>
					</Stack>
				))}
			</Stack>
		</Stack>
	);
};

export const ShowHotSpots = () => {
	const { data: hotSpots = [] } = trpc.getHotSpots.useQuery();
	const { mutateAsync: openFile } = trpc.openFile.useMutation();
	const { data: { simplifyPaths = false } = {} } = trpc.getSettings.useQuery();
	const { data: projectRoot } = trpc.getProjectRoot.useQuery();

	const findInPage = useCallback(
		async (path: string | undefined) => {
			if (!path) {
				throw new Error("Path is required to open file");
			}

			await openFile({
				path,
			});
		},
		[openFile],
	);
	console.log("hotSpots", { hotSpots });

	const firstHotSpot = hotSpots[0];
	const Icon = awards.hotSpots.icon;

	const hasHotSpots = (
		<List>
			{hotSpots.map(({ path, timeMs }) => {
				const relativeTime = timeMs / firstHotSpot.timeMs;
				const fileName = path?.split("/").slice(-1)[0] ?? "<no file name>";
				return (
					<ListItemButton key={path} sx={{ width: "100%" }}>
						<ListItemText>
							<Typography variant="h6" justifyContent="center">
								{fileName}
								{path ? (
									<IconButton
										size="small"
										onClick={() => findInPage(path)}
										sx={{ ml: 1 }}
									>
										<FindInPage fontSize="small" />
									</IconButton>
								) : null}
							</Typography>
							<Stack>
								<Typography variant="caption">
									{friendlyPackageName(path ?? "", projectRoot, simplifyPaths)}
								</Typography>
							</Stack>
							<InlineBarGraph
								label={`${timeMs.toLocaleString()}ms`}
								width={`${relativeTime * 100}%`}
							/>
						</ListItemText>
					</ListItemButton>
				);
			})}
		</List>
	);

	const noneFound = (
		<Stack direction="row" gap={2} alignItems="flex-start">
			<Callout title="No Hot Spots Found">
				<Typography>
					No hot spots detected. Did you run analyze-trace?
				</Typography>
			</Callout>
		</Stack>
	);

	return (
		<Stack>
			<TitleSubtitle
				title="Hot Spots"
				subtitle="The most expensive code paths in your application"
				icon={<Icon fontSize="large" />}
			/>

			{firstHotSpot ? hasHotSpots : noneFound}
		</Stack>
	);
};

type LimitType =
	| EventChecktypes__InstantiateType_DepthLimit
	| EventChecktypes__RecursiveTypeRelatedTo_DepthLimit
	| EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit;

const ShowTypeLimit = <L extends LimitType>({
	typeRegistry,
	notFound,
	title,
	rpc,
	icon: Icon,
	subtitle,
	inlineBarGraph,
	getKey,
	getTypeId,
}: {
	typeRegistry: TypeRegistry;
	notFound: {
		title: string;
		description: string;
	};
	title: string;
	rpc: { useQuery: () => { data?: L[] }};
	icon: (typeof awards)[keyof typeof awards]["icon"];
	subtitle: (first: L) => string;
	inlineBarGraph: (current: L, first: L) => ReactNode;
	getKey: (current: L) => string;
	getTypeId: (current: L) => number;
}) => {
	const { data = [] } = rpc.useQuery();
	const { data: { simplifyPaths = false } = {} } = trpc.getSettings.useQuery();
	const { data: projectRoot } = trpc.getProjectRoot.useQuery();
	const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
	const handleTypeClick = useCallback(
		(typeId: number) => {
			if (selectedTypeId === typeId) {
				setSelectedTypeId(null);
			} else {
				setSelectedTypeId(typeId);
			}
		},
		[selectedTypeId],
	);

	const first = data[0];

	if (!first) {
		return (
			<Callout title={notFound.title}>
				<Typography>{notFound.description}</Typography>
			</Callout>
		);
	}

	console.log(title, { data });

	return (
		<Stack direction="row" gap={2} alignItems="flex-start">
			<Stack sx={{ minWidth: 450, maxWidth: 450 }}>
				<TitleSubtitle
					title={title}
					subtitle={subtitle(first)}
					icon={<Icon fontSize="large" />}
				/>

				<List>
					{data.map((current) => {
						const typeId = getTypeId(current);
						const resolvedType = typeRegistry.get(typeId);
						const key = getKey(current);

						if (!resolvedType) {
							return (
								<ListItemText key={key}>
									<Typography color="error">
										Type {typeId} not found in type registry
									</Typography>
								</ListItemText>
							);
						}

						const extractedPath = extractPath(resolvedType);
						return (
							<ListItemButton key={key} onClick={() => handleTypeClick(typeId)}>
								<ListItemText>
									<TypeSummary resolvedType={resolvedType} />
									{extractedPath ? (
										<Typography variant="caption" sx={{ mr: 2 }}>
											{friendlyPackageName(
												extractedPath,
												projectRoot,
												simplifyPaths,
											)}
										</Typography>
									) : null}
									{inlineBarGraph(current, first)}
								</ListItemText>
							</ListItemButton>
						);
					})}
				</List>
			</Stack>

			{selectedTypeId === null ? null : (
				<>
					<Divider orientation="vertical" sx={{ mx: 2 }} />
					<DisplayRecursiveType
						id={selectedTypeId}
						typeRegistry={typeRegistry}
					/>
				</>
			)}
		</Stack>
	);
};

const InlineBarGraph = ({ width, label }: { width: string; label: string }) => {
	return (
		<Stack>
			<Typography
				sx={{
					color: theme.palette.text.disabled,
					fontSize: "0.8rem",
				}}
			>
				{label}
			</Typography>
			<Box
				style={{
					width,
					height: "4px",
					backgroundColor: theme.palette.primary.main,
					borderRadius: "2px",
					marginTop: "2px",
				}}
			/>
		</Stack>
	);
};
