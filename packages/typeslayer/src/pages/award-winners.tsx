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
	Button,
	Divider,
	IconButton,
	List,
	ListItem,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	ListSubheader,
	Stack,
	Typography,
} from "@mui/material";
import { useNavigate, useParams } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";
import type {
	EventChecktypes__InstantiateType_DepthLimit,
	EventChecktypes__RecursiveTypeRelatedTo_DepthLimit,
	EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit,
	ResolvedType,
	TypeRegistry,
} from "@typeslayer/validate";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { Callout } from "../components/callout";
import { DisplayRecursiveType } from "../components/display-recursive-type";
import { InlineCode } from "../components/inline-code";
import { TypeSummary } from "../components/type-summary";
import { extractPath, friendlyPackageName } from "../components/utils";
import { useProjectRoot, useSimplifyPaths } from "../hooks/tauri-hooks";
import { theme } from "../theme";

type AwardId = keyof typeof awards;

const awards = {
	hotSpots: {
		title: "Hot Spots",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: Whatshot,
		route: "hot-spots",
	},
	unionTypes: {
		title: "Largest Union",
		property: "unionTypes",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: JoinFull,
		unit: "union members",
		route: "largest-union",
	},
	duplicatePackages: {
		title: "Duplicate Packages",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: CopyAll,
		route: "duplicate-packages",
	},
	typeArguments: {
		title: "Most Type Arguments",
		property: "typeArguments",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: SportsKabaddi,
		unit: "type arguments",
		route: "most-type-arguments",
	},
	intersectionTypes: {
		title: "Largest Intersection",
		property: "intersectionTypes",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: JoinInner,
		unit: "intersections",
		route: "largest-intersection",
	},
	aliasTypeArguments: {
		title: "Alias Type Arguments",
		property: "aliasTypeArguments",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: GroupAdd,
		unit: "aliased type arguments",
		route: "alias-type-arguments",
	},
	limit_instantiateType: {
		title: "Type Instantiation Limit",
		property: "limit_instantiateType",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: Lightbulb,
		route: "type-instantiation-limit",
	},
	limit_recursiveTypeRelatedTo: {
		title: "Recursive Relations Limit",
		property: "limit_recursiveTypeRelatedTo",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: Diversity1,
		route: "recursive-relations-limit",
	},
	limit_typeRelatedToDiscriminatedType: {
		title: "Discrimination Limit",
		property: "limit_typeRelatedToDiscriminatedType",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: SafetyDivider,
		route: "discrimination-limit",
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
	const { title, icon: Icon, route } = awards[awardId];
	const navigate = useNavigate();
	const onClick = useCallback(() => {
		setActiveAward(awardId);
		navigate({ to: `/award-winners/${route}` });
	}, [awardId, setActiveAward, route, navigate]);
	const selected = activeAward === awardId;
	return (
		<ListItemButton key={awardId} selected={selected} onClick={onClick}>
			<ListItemIcon sx={{ minWidth: 38 }}>
				<Icon />
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
				<ArrayAward
					key={activeAward}
					typeRegistry={typeRegistry}
					{...awards.typeArguments}
				/>
			);
		case "unionTypes":
			return (
				<ArrayAward
					key={activeAward}
					typeRegistry={typeRegistry}
					{...awards.unionTypes}
				/>
			);
		case "intersectionTypes":
			return (
				<ArrayAward
					key={activeAward}
					typeRegistry={typeRegistry}
					{...awards.intersectionTypes}
				/>
			);
		case "aliasTypeArguments":
			return (
				<ArrayAward
					key={activeAward}
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
					fetch={async () => {
						return (await invoke(
							"get_type_instantiation_limits",
						)) as EventChecktypes__InstantiateType_DepthLimit[];
					}}
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
					fetch={async () => {
						return (await invoke(
							"get_recursive_type_related_to_limits",
						)) as EventChecktypes__RecursiveTypeRelatedTo_DepthLimit[];
					}}
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
					fetch={async () => {
						return (await invoke(
							"get_type_related_to_discriminated_type_limits",
						)) as EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit[];
					}}
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
	const params = useParams({ strict: false });
	const awardId = params.awardId as string | undefined;

	// Find the award key that matches the route
	const getAwardIdFromRoute = useCallback(
		(route: string | undefined): AwardId | null => {
			if (!route) return "unionTypes";
			const entry = Object.entries(awards).find(
				([_, award]) => award.route === route,
			);
			return entry ? (entry[0] as AwardId) : "unionTypes";
		},
		[],
	);

	const [activeAward, setActiveAward] = useState<AwardId | null>(
		getAwardIdFromRoute(awardId),
	);

	// Sync active award when URL changes
	useEffect(() => {
		const newAward = getAwardIdFromRoute(awardId);
		if (newAward !== activeAward) {
			setActiveAward(newAward);
		}
	}, [awardId, activeAward, getAwardIdFromRoute]);

	console.log({ activeAward });

	const [typeRegistry, setTypeRegistry] = useState<TypeRegistry>(new Map());
	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const types: ResolvedType[] = await invoke("get_types_json");
				const entries = types.map((t) => [t.id, t]) as [number, ResolvedType][];
				if (mounted) setTypeRegistry(new Map(entries));
				(window as unknown as { typeRegistry: TypeRegistry }).typeRegistry =
					new Map(entries);
			} catch (e) {
				console.error("Failed to load types registry", e);
			}
		})();
		return () => {
			mounted = false;
		};
	}, []);
	window.typeRegistry = typeRegistry;

	return (
		<Stack
			direction="row"
			sx={{
				minWidth: 500,
				minHeight: 500,
				alignItems: "flex-start",
				flexGrow: 1,
				height: "100%",
				display: "flex",
			}}
		>
			<Stack
				sx={{
					px: 1,
					minHeight: "100%",
					flexShrink: 0,
					backgroundImage:
						"radial-gradient(circle at 85% 70%, rgba(159,30,30,0.1), transparent 50%)," +
						"radial-gradient(circle at 30% 20%, rgba(227,179,65,0.025), transparent 60%)",
				}}
			>
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

				<List
					sx={{ width: "100%", maxWidth: 350, height: "100%" }}
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

				<List subheader={<ListSubheader>Bundle Implications</ListSubheader>}>
					<RenderAward
						activeAward={activeAward}
						setActiveAward={setActiveAward}
						awardId={"duplicatePackages"}
					/>
				</List>
			</Stack>

			<Divider orientation="vertical" />

			<Box
				sx={{
					flexGrow: 1,
					maxWidth: "100%",
					height: "100%",
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
		<Stack gap={1}>
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
	const [displayLimit, setDisplayLimit] = useState(20);
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	const handleListItemClick = (
		_event: React.MouseEvent<HTMLDivElement, MouseEvent>,
		index: number,
	) => {
		setSelectedIndex(index);
		// Reset scroll to top when selecting a new item
		if (scrollContainerRef.current) {
			scrollContainerRef.current.scrollTop = 0;
		}
	};

	// sort typeRegistryEntries by ones that have the hightest number of the "thing"
	const sorted = Array.from(typeRegistry.values())
		.filter((resolvedType: ResolvedType) => property in resolvedType)
		.sort((a: ResolvedType, b: ResolvedType) => {
			const aValue = (a[property] as unknown as number[] | undefined)?.length ?? 0;
			const bValue = (b[property] as unknown as number[] | undefined)?.length ?? 0;
			return bValue - aValue;
		});

	const maxValue = sorted[0]?.[property]?.length ?? 0;

	const cutoff = 50;
	const currentLimit = Math.min(displayLimit, sorted.length);
	const hasMore = sorted.length > currentLimit;
	const remaining = sorted.length - currentLimit;

	return (
		<Stack
			sx={{
				flexDirection: "row",
				alignItems: "flex-start",
				height: "100%",
			}}
		>
			<Stack
				sx={{
					maxWidth: 450,
					minWidth: 450,
					p: 3,
					overflowY: "auto",
					maxHeight: "100%",
				}}
			>
				<TitleSubtitle
					title={title}
					subtitle={description}
					icon={<Icon fontSize="large" />}
				/>

				<Stack sx={{ my: 2 }}>
				<List>
					{sorted.slice(0, currentLimit).map(({ id }, index) => {
						const value = (sorted[index][property] as unknown as number[] | undefined)?.length ?? 0;
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
										<Stack sx={{ flexGrow: 1 }} gap={0}>
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
					{hasMore && (
						<Stack
							direction="row"
							gap={2}
							alignItems="center"
							sx={{ px: 2, mb: 2 }}
						>
							<Typography>
								showing {currentLimit.toLocaleString()} out of{" "}
								{sorted.length.toLocaleString()}
							</Typography>
							<Button
								variant="outlined"
								size="small"
								onClick={() => setDisplayLimit((prev) => prev + cutoff)}
							>
								Show {Math.min(cutoff, remaining).toLocaleString()} more
							</Button>
						</Stack>
					)}
				</Stack>
			</Stack>

			<Divider orientation="vertical" />

			<Box
				sx={{
					p: 3,
					overflowY: "auto",
					maxHeight: "100%",
					width: "100%",
					height: "100%",
				}}
				ref={scrollContainerRef}
			>
				<DisplayRecursiveType
					id={(sorted[selectedIndex] as ResolvedType | undefined)?.id ?? 0}
					typeRegistry={typeRegistry}
				/>
			</Box>
		</Stack>
	);
}

const DuplicatePackages = () => {
	const [duplicatePackages, setDuplicatePackages] = useState<
		{ name: string; instances: { path: string; version: string }[] }[]
	>([]);
	useEffect(() => {
		(async () => {
			try {
				const result: {
					duplicatePackages: {
						name: string;
						instances: { path: string; version: string }[];
					}[];
				} = await invoke("get_analyze_trace");
				setDuplicatePackages(result.duplicatePackages ?? []);
			} catch (e) {
				console.error("Failed to load duplicate packages", e);
			}
		})();
	}, []);
	const Icon = awards.duplicatePackages.icon;
	return (
		<Stack sx={{ m: 3, gap: 2 }}>
			<TitleSubtitle
				title="Duplicate Packages"
				subtitle="Packages that are duplicated in the bundle.  TypeScript doesn't keep track of where these were included from, but at least now you know they're there."
				icon={<Icon fontSize="large" />}
			/>

			<Stack gap={3}>
				{duplicatePackages.map(({ instances, name }) => (
					<Stack key={name}>
						<Typography variant="h5" color="primary">
							{name}
						</Typography>

						<List>
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
	const [hotSpots, setHotSpots] = useState<
		Array<{ path?: string; timeMs: number }>
	>([]);
	const simplifyPaths = useSimplifyPaths();
	const projectRoot = useProjectRoot();
	
	useEffect(() => {
		(async () => {
			try {
				const result: { hotSpots: Array<{ path?: string; timeMs: number }> } =
					await invoke("get_analyze_trace");
				setHotSpots(result.hotSpots ?? []);
			} catch (e) {
				console.error("Failed to load hot spots", e);
			}
		})();
	}, []);

	const findInPage = useCallback(async (path: string | undefined) => {
		if (!path) return;
		try {
			await openPath(path);
		} catch (e) {
			console.error("Failed to open file", e);
		}
	}, []);
	
	if (simplifyPaths.isLoading || projectRoot.isLoading || simplifyPaths.data === undefined || projectRoot.data === undefined) {
		return null;
	}
	
	// Type narrowing: we know data exists after the check above
	const simplifyPathsValue: boolean = simplifyPaths.data;
	const projectRootValue: string = projectRoot.data;
	
	console.log("hotSpots", { hotSpots });

	const firstHotSpot = hotSpots[0];
	const Icon = awards.hotSpots.icon;

	const hasHotSpots = (
		<List>
			{hotSpots.map(({ path, timeMs }) => {
				const relativeTime = timeMs / firstHotSpot.timeMs;
				const fileName = path?.split("/").slice(-1)[0] ?? "<no file name>";
				return (
					<ListItem key={path} sx={{ width: "100%" }}>
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
										{friendlyPackageName(path ?? "", projectRootValue, simplifyPathsValue)}
								</Typography>
							</Stack>
							<InlineBarGraph
								label={`${timeMs.toLocaleString()}ms`}
								width={`${relativeTime * 100}%`}
							/>
						</ListItemText>
					</ListItem>
				);
			})}
		</List>
	);

	const noneFound = (
		<Stack direction="row" alignItems="flex-start">
			<Callout title="No Hot Spots Found">
				<Typography>
					No hot spots detected. Did you run analyze-trace?
				</Typography>
			</Callout>
		</Stack>
	);

	return (
		<Stack sx={{ m: 3 }}>
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
	fetch,
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
	fetch: () => Promise<L[]>;
	icon: (typeof awards)[keyof typeof awards]["icon"];
	subtitle: (first: L) => string;
	inlineBarGraph: (current: L, first: L) => ReactNode;
	getKey: (current: L) => string;
	getTypeId: (current: L) => number;
}) => {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [data, setData] = useState<L[]>([]);
	const [selectedIndex, setSelectedIndex] = useState<number>(0);
	const simplifyPaths = useSimplifyPaths();
	const projectRoot = useProjectRoot();

	useEffect(() => {
		(async () => {
			try {
				const res = await fetch();
				setData(res ?? []);
			} catch (e) {
				console.error("Failed to load type limits", e);
			}
		})();
	}, [fetch]);

	const handleTypeClick = useCallback((index: number) => {
		setSelectedIndex(index);
		if (scrollContainerRef.current) {
			scrollContainerRef.current.scrollTop = 0;
		}
	}, []);

	if (simplifyPaths.isLoading || projectRoot.isLoading || simplifyPaths.data === undefined || projectRoot.data === undefined) {
		return null;
	}

	// Type narrowing: we know data exists after the check above
	const simplifyPathsValue: boolean = simplifyPaths.data;
	const projectRootValue: string = projectRoot.data;

	if (data.length === 0) {
		return (
			<Callout title={notFound.title} sx={{ m: 3 }}>
				<Typography>{notFound.description}</Typography>
			</Callout>
		);
	}

	console.log(title, { data });

	const first = data[0];

	return (
		<Stack
			sx={{
				flexDirection: "row",
				alignItems: "flex-start",
				height: "100%",
			}}
		>
			<Stack
				sx={{
					minWidth: 500,
					maxWidth: 500,
					p: 3,
					overflowY: "auto",
					maxHeight: "100%",
				}}
			>
				<TitleSubtitle
					title={title}
					subtitle={subtitle(first)}
					icon={<Icon fontSize="large" />}
				/>

				<List>
					{data.map((current, index) => {
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
							<ListItemButton
								key={key}
								onClick={() => handleTypeClick(index)}
								selected={index === selectedIndex}
							>
								<ListItemText>
									<TypeSummary resolvedType={resolvedType} />
									{extractedPath ? (
										<Typography variant="caption" sx={{ mr: 2 }}>
											{friendlyPackageName(
												extractedPath,
												projectRootValue,
												simplifyPathsValue,
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

			<Divider orientation="vertical" />

			<Box
				sx={{
					p: 3,
					overflowY: "auto",
					maxHeight: "100%",
					width: "100%",
					height: "100%",
				}}
				ref={scrollContainerRef}
			>
				<DisplayRecursiveType
					id={getTypeId(data[selectedIndex])}
					typeRegistry={typeRegistry}
				/>
			</Box>
		</Stack>
	);
};

const InlineBarGraph = ({ width, label }: { width: string; label: string }) => {
	return (
		<Stack>
			<Box
				style={{
					width,
					height: "4px",
					backgroundColor: theme.palette.primary.main,
					borderRadius: "2px",
					marginTop: "2px",
				}}
			/>

			<Typography
				sx={{
					color: theme.palette.text.secondary,
					fontSize: "0.8rem",
				}}
			>
				{label}
			</Typography>
		</Stack>
	);
};
