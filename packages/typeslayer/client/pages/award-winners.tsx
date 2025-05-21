import {
	Diversity1,
	FolderCopy,
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
	ListItemButton,
	Stack,
	Typography,
} from "@mui/material";
import type { ResolvedType, TypeRegistry } from "@typeslayer/validate";
import { type ReactNode, useCallback, useState } from "react";
import { AwardPlaque } from "../components/award-plaque";
import { Callout } from "../components/callout";
import { DisplayRecursiveType } from "../components/display-recursive-type";
import { InlineCode } from "../components/inline-code";
import { TypeSummary } from "../components/type-summary";
import { theme } from "../theme";
import { trpc } from "../trpc";

const arrayItems = {
	unionTypes: {
		title: "Union Types",
		property: "unionTypes",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: <JoinFull fontSize="large" />,
	},
	typeArguments: {
		title: "Type Arguments",
		property: "typeArguments",
		description:
			"Awarded for the most ruthless code simplification without breaking anything.",
		icon: <SportsKabaddi fontSize="large" />,
	},
	intersectionTypes: {
		title: "Intersection Types",
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
		icon: <FolderCopy fontSize="large" />,
	},
} as const;

const hotSpots = {
	title: "Hot Spots",
	property: "hotSpots",
	description:
		"Awarded for the most ruthless code simplification without breaking anything.",
	icon: <Whatshot fontSize="large" />,
};

const limit_instantiateType = {
	title: "Type Instantiation Limit",
	property: "hotSpots",
	description:
		"Awarded for the most ruthless code simplification without breaking anything.",
	icon: <Lightbulb fontSize="large" />,
};

const limit_recursiveTypeRelatedTo = {
	title: "Recursive Relations Limit",
	property: "hotSpots",
	description:
		"Awarded for the most ruthless code simplification without breaking anything.",
	icon: <Diversity1 fontSize="large" />,
};

const limit_typeRelatedToDiscriminatedType = {
	title: "Discrimination Limit",
	property: "hotSpots",
	description:
		"Awarded for the most ruthless code simplification without breaking anything.",
	icon: <SafetyDivider fontSize="large" />,
};

export const AwardWinners = () => {
	const [activeAward, setActiveAward] = useState<string | null>(null);
	const isActive = useCallback(
		(award: string) => activeAward === award,
		[activeAward],
	);

	const { data: typeRegistryEntries } = trpc.getTypeRegistry.useQuery();
	const typeRegistry: TypeRegistry = new Map(typeRegistryEntries ?? []);
	window.typeRegistry = typeRegistry;

	let playground: ReactNode = null;
	switch (activeAward) {
		case arrayItems.typeArguments.title:
			playground = (
				<ArrayAward typeRegistry={typeRegistry} {...arrayItems.typeArguments} />
			);
			break;
		case arrayItems.unionTypes.title:
			playground = (
				<ArrayAward typeRegistry={typeRegistry} {...arrayItems.unionTypes} />
			);
			break;
		case arrayItems.intersectionTypes.title:
			playground = (
				<ArrayAward
					typeRegistry={typeRegistry}
					{...arrayItems.intersectionTypes}
				/>
			);
			break;
		case arrayItems.aliasTypeArguments.title:
			playground = (
				<ArrayAward
					typeRegistry={typeRegistry}
					{...arrayItems.aliasTypeArguments}
				/>
			);
			break;
		case hotSpots.title:
		case limit_instantiateType.title:
		case limit_recursiveTypeRelatedTo.title:
		case limit_typeRelatedToDiscriminatedType.title:
			playground = <div>TODO</div>;
			break;

		default:
			playground = <InfoBox />;
			break;
	}

	return (
		<Stack
			direction="row"
			sx={{ m: 4, minWidth: 500, minHeight: 500, alignItems: "flex-start" }}
		>
			<Stack sx={{ minWidth: 250 }}>
				<h1>Award Winners</h1>
				<Typography>
					Your project's types-level
					<br />
					Hall of Fame (Shame?).
				</Typography>

				<Stack sx={{ my: 2 }} gap={2}>
					<AwardPlaque
						title={hotSpots.title}
						icon={hotSpots.icon}
						description={hotSpots.description}
						isActive={isActive}
						activate={setActiveAward}
					/>
					<AwardPlaque
						title={limit_instantiateType.title}
						icon={limit_instantiateType.icon}
						description={limit_instantiateType.description}
						isActive={isActive}
						activate={setActiveAward}
					/>
					<AwardPlaque
						title={limit_recursiveTypeRelatedTo.title}
						icon={limit_recursiveTypeRelatedTo.icon}
						description={limit_recursiveTypeRelatedTo.description}
						isActive={isActive}
						activate={setActiveAward}
					/>
					<AwardPlaque
						title={limit_typeRelatedToDiscriminatedType.title}
						icon={limit_typeRelatedToDiscriminatedType.icon}
						description={limit_typeRelatedToDiscriminatedType.description}
						isActive={isActive}
						activate={setActiveAward}
					/>
					{Object.values(arrayItems).map(({ title, icon, description }) => (
						<AwardPlaque
							key={title}
							title={title}
							icon={icon}
							description={description}
							isActive={isActive}
							activate={setActiveAward}
						/>
					))}
				</Stack>
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

function ArrayAward({
	title,
	description,
	property,
	icon,
	typeRegistry,
}: {
	title: string;
	description: string;
	property: keyof typeof arrayItems;
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

	console.log(`by ${title}`, sorted);

	const maxValue = sorted[0]?.[property]?.length ?? 0;

	const top = 100;

	return (
		<Stack direction="row" gap={2} alignItems="flex-start">
			<Stack sx={{ mx: 1 }}>
				<Stack direction="row" gap={2} alignItems="center">
					{icon}
					<h1>{title}</h1>
				</Stack>
				<Typography>{description}</Typography>

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
