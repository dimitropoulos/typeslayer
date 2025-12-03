import {
	Box,
	Button,
	Divider,
	List,
	ListItemButton,
	ListItemText,
	Stack,
	Typography,
} from "@mui/material";
import type { ResolvedType, TypeRegistry } from "@typeslayer/validate";
import { useRef, useState } from "react";
import { DisplayRecursiveType } from "../../components/display-recursive-type";
import { TypeSummary } from "../../components/type-summary";
import type { awards } from "./awards";
import { InlineBarGraph } from "./inline-bar-graph";
import { TitleSubtitle } from "./title-subtitle";

export function ArrayAward({
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
			const aValue =
				(a[property] as unknown as number[] | undefined)?.length ?? 0;
			const bValue =
				(b[property] as unknown as number[] | undefined)?.length ?? 0;
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
							const value =
								(sorted[index][property] as unknown as number[] | undefined)
									?.length ?? 0;
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
				{sorted[selectedIndex]?.id && typeRegistry ? (
					<DisplayRecursiveType
						id={sorted[selectedIndex].id}
						typeRegistry={typeRegistry}
					/>
				) : (
					<span>Loading...</span>
				)}
			</Box>
		</Stack>
	);
}
