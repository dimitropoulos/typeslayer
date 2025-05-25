import {
	CopyAll,
	Diversity1,
	EmojiEvents,
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
} from "@mui/material";
import type { ResolvedType, TypeRegistry } from "@typeslayer/validate";
import { type ReactNode, useCallback, useState } from "react";
import { Callout } from "../components/callout";
import { DisplayRecursiveType } from "../components/display-recursive-type";
import { InlineCode } from "../components/inline-code";
import { TypeSummary } from "../components/type-summary";
import { theme } from "../theme";
import { trpc } from "../trpc";

type AwardId = keyof typeof awards;

const awards = {
	hotSpots: {
		title: "Hot Spot",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: <Whatshot fontSize="large" />,
	},
	unionTypes: {
		title: "Largest Union",
		property: "unionTypes",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: <JoinFull fontSize="large" />,
	},
	duplicatePackages: {
		title: "Duplicate Packages",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: <CopyAll fontSize="large" />,
	},
	typeArguments: {
		title: "Most Type Arguments",
		property: "typeArguments",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: <SportsKabaddi fontSize="large" />,
	},
	intersectionTypes: {
		title: "Largest Intersection",
		property: "intersectionTypes",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: <JoinInner fontSize="large" />,
	},
	aliasTypeArguments: {
		title: "Alias Type Arguments",
		property: "aliasTypeArguments",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: <GroupAdd fontSize="large" />,
	},
	limit_instantiateType: {
		title: "Type Instantiation Limit",
		property: "hotSpots",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: <Lightbulb fontSize="large" />,
	},
	limit_recursiveTypeRelatedTo: {
		title: "Recursive Relations Limit",
		property: "hotSpots",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: <Diversity1 fontSize="large" />,
	},
	limit_typeRelatedToDiscriminatedType: {
		title: "Discrimination Limit",
		property: "hotSpots",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: <SafetyDivider fontSize="large" />,
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
		const { title, icon } = awards[awardId];
		return (
			<ListItemButton
				key={awardId}
				selected={activeAward === awardId}
				onClick={() => setActiveAward(awardId)}
			>
				<ListItemIcon>{icon}</ListItemIcon>
				<ListItemText>{title}</ListItemText>
			</ListItemButton>
		);
	};

export const AwardWinners = () => {
	const [activeAward, setActiveAward] = useState<AwardId | null>(null);

	const { data: typeRegistryEntries } = trpc.getTypeRegistry.useQuery();
	const typeRegistry: TypeRegistry = new Map(typeRegistryEntries ?? []);
	window.typeRegistry = typeRegistry;

	let playground: ReactNode = null;
	switch (activeAward) {
		case "typeArguments":
			playground = (
				<ArrayAward typeRegistry={typeRegistry} {...awards.typeArguments} />
			);
			break;
		case "unionTypes":
			playground = (
				<ArrayAward typeRegistry={typeRegistry} {...awards.unionTypes} />
			);
			break;
		case "intersectionTypes":
			playground = (
				<ArrayAward typeRegistry={typeRegistry} {...awards.intersectionTypes} />
			);
			break;
		case "aliasTypeArguments":
			playground = (
				<ArrayAward
					typeRegistry={typeRegistry}
					{...awards.aliasTypeArguments}
				/>
			);
			break;
			case "duplicatePackages":
				playground = <DuplicatePackages />;
				break;
		case "hotSpots":
		case "limit_instantiateType":
		case "limit_recursiveTypeRelatedTo":
		case "limit_typeRelatedToDiscriminatedType":
			playground = <div>TODO</div>;
			break;

		default:
			playground = <InfoBox />;
			break;
	}

	const Award = RenderAward({ activeAward, setActiveAward });

	return (
		<Stack
			direction="row"
			sx={{ m: 4, minWidth: 500, minHeight: 500, alignItems: "flex-start" }}
		>
			<Stack sx={{ minWidth: 250 }}>
				<TitleSubtitle
					title="Award Winners"
					subtitle="A types-level Hall of Shame"
					icon={<EmojiEvents fontSize="large" />}
				/>

				<List>
					<ListSubheader>Performance Metrics</ListSubheader>
					{(
						[
							"hotSpots",
							"limit_instantiateType",
							"limit_recursiveTypeRelatedTo",
							"limit_typeRelatedToDiscriminatedType",
						] as const
					).map(Award)}

					<ListSubheader>Type-level Metrics</ListSubheader>
					{(
						[
							"unionTypes",
							"intersectionTypes",
							"typeArguments",
							"aliasTypeArguments",
						] as const
					).map(Award)}

					<ListSubheader>Bundle Implications</ListSubheader>
					{(["duplicatePackages"] as const).map(Award)}
				</List>
			</Stack>

			<Divider orientation="vertical" sx={{ mx: 2 }} />

			{playground}
		</Stack>
	);
};

function InfoBox() {
	return (
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
	icon,
	typeRegistry,
}: {
	title: string;
	description: string;
	property:
		| typeof awards.unionTypes.property
		| typeof awards.typeArguments.property
		| typeof awards.intersectionTypes.property
		| typeof awards.aliasTypeArguments.property;
	icon: ReactNode;
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
					icon={icon}
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
									<Typography sx={{ mr: 2 }}>{index + 1}.</Typography>
									<Stack sx={{ flexGrow: 1, py: 1 }}>
										<TypeSummary resolvedType={sorted[index]} />
										<Stack direction="row" alignItems="center">
											<Box
												sx={{
													width: count ? `${(count / maxValue) * 100}%` : "0%",
													height: 2,
													backgroundColor: theme.palette.primary.dark,
												}}
											/>
											<Typography
												sx={{
													ml: 1,
													opacity: 0.7,
													fontSize: "0.85rem",
													lineHeight: 1,
												}}
											>
												{count?.toLocaleString()}
											</Typography>
										</Stack>
									</Stack>
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
				icon={<CopyAll fontSize="large"/>}
			/>
			{duplicatePackages.map(({ instances, name }) => (
				<Stack key={name} direction="row" gap={2} alignItems="flex-start">
					<Stack sx={{ mx: 1 }}>
						<Typography variant="h5" sx={{ pl: 2, mt: 2 }}>
							{name}
						</Typography>
						<List>
							{instances.map(({ path, version}) => (
								<ListItemButton
									key={path}
									sx={{
										width: "100%",
									}}
								>
									<Typography sx={{ mr: 2 }}>{path}</Typography>
									<Stack sx={{ flexGrow: 1, py: 1 }}>
										<Typography
											sx={{
												ml: 1,
												opacity: 0.7,
												fontSize: "0.85rem",
												lineHeight: 1,
											}}
										>
											v{version}
										</Typography>
									</Stack>
								</ListItemButton>
							))}
						</List>
						</Stack>
					<Divider orientation="vertical" sx={{ mx: 2 }} />
				</Stack> ))}
		</Stack>

	);
}