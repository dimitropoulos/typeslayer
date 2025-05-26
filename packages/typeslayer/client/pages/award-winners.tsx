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
	List,
	ListItemIcon,
	ListItemButton,
	ListItemText,
	Stack,
	Typography,
	ListSubheader,
	IconButton,
	ListItem,
} from "@mui/material";
import type { ResolvedType, TypeRegistry } from "@typeslayer/validate";
import { type ReactNode, useCallback, useState } from "react";
import { Callout } from "../components/callout";
import {
	DisplayRecursiveType,
	OpenFile,
} from "../components/display-recursive-type";
import { InlineCode } from "../components/inline-code";
import { TypeSummary } from "../components/type-summary";
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
	},
	intersectionTypes: {
		title: "Largest Intersection",
		property: "intersectionTypes",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: JoinInner,
	},
	aliasTypeArguments: {
		title: "Alias Type Arguments",
		property: "aliasTypeArguments",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: GroupAdd,
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

export const RenderAward =
	({
		activeAward,
		setActiveAward,
	}: {
		activeAward: AwardId | null;
		setActiveAward: (award: AwardId) => void;
	}) =>
	(awardId: AwardId) => {
		const { title, icon: Icon } = awards[awardId];
		const onClick = useCallback(
			() => setActiveAward(awardId),
			[awardId, setActiveAward],
		);
		const selected = activeAward === awardId;
		const color = (selected ? { color: theme.palette.primary.dark } : {});
		return (
			<ListItemButton
				key={awardId}
				selected={selected}
				sx={{
					borderRadius: 2,
					...color
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
			return <LimitInstantiateType typeRegistry={typeRegistry} />;
		case "limit_recursiveTypeRelatedTo":
		case "limit_typeRelatedToDiscriminatedType":
			return <div>TODO</div>;

		default:
			return <InfoBox />;
	}
};

export const AwardWinners = () => {
	const [activeAward, setActiveAward] = useState<AwardId | null>(null);
	console.log({ activeAward });

	const { data: typeRegistryEntries } = trpc.getTypeRegistry.useQuery();
	const typeRegistry: TypeRegistry = new Map(typeRegistryEntries ?? []);
	window.typeRegistry = typeRegistry;

	const Award = RenderAward({ activeAward, setActiveAward });

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
					p: 1,
					minWidth: 300,
					minHeight: "100%",
					backgroundColor: theme.palette.background.paper,
				}}
			>
				<List
					sx={{ width: "100%", maxWidth: 350 }}
					component="nav"
					subheader={
						<ListSubheader sx={{ pl: 1, py: 0, my: 0}}>
							Performance Metrics
						</ListSubheader>
					}
				>
					{(
						[
							"hotSpots",
							"limit_instantiateType",
							"limit_recursiveTypeRelatedTo",
							"limit_typeRelatedToDiscriminatedType",
						] as const
					).map(Award)}
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
					).map(Award)}
				</List>
				<Divider />

				<List subheader={<ListSubheader>Bundle Implications</ListSubheader>}>
					{(["duplicatePackages"] as const).map(Award)}
				</List>
			</Stack>

			<Box sx={{ p: 4 }}>
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
}) {
	const [selectedIndex, setSelectedIndex] = useState(0);

	const handleListItemClick = (
		event: React.MouseEvent<HTMLDivElement, MouseEvent>,
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
			<Stack sx={{ mx: 1 }}>
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
							const count = sorted[index][property]?.length;
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
												<Typography
													sx={{
														opacity: 0.7,
														fontSize: "0.85rem",
														lineHeight: 1,
													}}
												>
													{count?.toLocaleString()}
												</Typography>

												<Box
													sx={{
														width: count
															? `${(count / maxValue) * 100}%`
															: "0%",
														height: 4,
														borderRadius: 2,
														backgroundColor: theme.palette.primary.main,
													}}
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
				simplifyPaths={false}
			/>
		</Stack>
	);
}

const DuplicatePackages = () => {
	const { data: duplicatePackages = [] } = trpc.getDuplicatePackages.useQuery();

	return (
		<Stack>
			<TitleSubtitle
				title="Duplicate Packages"
				subtitle="packages that are duplicated in the bundle"
				icon={<CopyAll fontSize="large" />}
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

	return (
		<Stack>
			<TitleSubtitle
				title="Hot Spots"
				subtitle="The most expensive code paths in your application"
				icon={<Whatshot fontSize="large" />}
			/>

			{firstHotSpot ? (
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
										<Typography variant="caption">{path}</Typography>
										<Typography variant="caption">
											{timeMs.toLocaleString()}ms
										</Typography>
									</Stack>
									<Box
										style={{
											width: `${relativeTime * 100}%`,
											height: "4px",
											backgroundColor: theme.palette.primary.main,
											borderRadius: "2px",
											marginTop: "4px",
										}}
									/>
								</ListItemText>
							</ListItemButton>
						);
					})}
				</List>
			) : (
				<Stack direction="row" gap={2} alignItems="flex-start">
					<Callout title="No Hot Spots Found">
						<Typography>
							No hot spots detected. Did you run analyze-trace?
						</Typography>
					</Callout>
				</Stack>
			)}
		</Stack>
	);
};

const LimitInstantiateType = ({
	typeRegistry,
}: {
	typeRegistry: TypeRegistry;
}) => {
	const { data = [] } = trpc.getTypeInstantiationLimits.useQuery();

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

	const fist = data[0];

	if (!fist) {
		return (
			<Callout title="No Type Instantiation Limits Found">
				<Typography>
					No type instantiation limits detected. Did you run analyze-trace?
				</Typography>
			</Callout>
		);
	}

	const limit = data[0].args.instantiationDepth;

	console.log("Type Instantiation Limits", { data });

	return (
		<Stack>
			<TitleSubtitle
				title="Type Instantiation Limits"
				subtitle={`The most complex types that were limited by the type system.\nThe current limit is set to ${limit.toLocaleString()}.`}
				icon={<Lightbulb fontSize="large" />}
			/>
			<Stack direction="row" gap={2} alignItems="flex-start">
				<List>
					{data.map(
						({
							ts,
							args: { instantiationCount, instantiationDepth, typeId },
						}) => {
							const resolvedType = typeRegistry.get(typeId);
							const key = `${typeId}-${instantiationCount}-${instantiationDepth}:${ts}`;

							if (!resolvedType) {
								return (
									<ListItemText key={key}>
										<Typography color="error">
											Type {typeId} not found in type registry
										</Typography>
									</ListItemText>
								);
							}

							const relativeDepth = instantiationDepth / limit;

							return (
								<ListItemButton
									key={key}
									onClick={() => handleTypeClick(typeId)}
								>
									<ListItemText>
										<TypeSummary resolvedType={resolvedType} />
										<Typography variant="caption">
											Depth: {instantiationDepth}
										</Typography>

										<Box
											style={{
												width: `${relativeDepth * 100}%`,
												height: "4px",
												backgroundColor: theme.palette.primary.main,
												borderRadius: "2px",
												marginTop: "4px",
											}}
										/>
									</ListItemText>
								</ListItemButton>
							);
						},
					)}
				</List>

				{selectedTypeId === null ? null : (
					<>
						<Divider orientation="vertical" sx={{ mx: 2 }} />
						<DisplayRecursiveType
							id={selectedTypeId}
							typeRegistry={typeRegistry}
							simplifyPaths={false}
						/>
					</>
				)}
			</Stack>
		</Stack>
	);
};
