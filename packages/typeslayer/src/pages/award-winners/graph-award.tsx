import {
	Box,
	Button,
	Divider,
	List,
	ListItem,
	ListItemButton,
	ListItemText,
	Stack,
	Typography,
} from "@mui/material";
import type { ResolvedType, TypeRegistry } from "@typeslayer/validate";
import { useRef, useState } from "react";
import { DisplayRecursiveType } from "../../components/display-recursive-type";
import { TypeSummary } from "../../components/type-summary";
import { useTypeGraph } from "../../hooks/tauri-hooks";
import type { awards } from "./awards";
import { InlineBarGraph } from "./inline-bar-graph";
import { TitleSubtitle } from "./title-subtitle";

export function GraphAward({
	title,
	description,
	icon: Icon,
	typeRegistry,
	unit,
}: {
	title: string;
	description: string;
	icon: (typeof awards)[keyof typeof awards]["icon"];
	typeRegistry: TypeRegistry;
	unit: string;
}) {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [displayLimit, setDisplayLimit] = useState(20);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const { data: typeGraph, isLoading } = useTypeGraph();

	const handleListItemClick = (
		_event: React.MouseEvent<HTMLDivElement, MouseEvent>,
		index: number,
	) => {
		setSelectedIndex(index);
		if (scrollContainerRef.current) {
			scrollContainerRef.current.scrollTop = 0;
		}
	};

	if (isLoading) {
		return <Typography>Loading...</Typography>;
	}

	const edgeStats = typeGraph?.edgeStats.initiated;

	if (!edgeStats) {
		return (
			<Typography>
				No type instantiation data available. Please generate a trace.json file
				first.
			</Typography>
		);
	}

	// Use pre-calculated edge stats from backend
	const sorted = edgeStats.entries
		.map(([typeId, sourceIds]) => {
			const resolvedType = typeRegistry.get(typeId);
			return resolvedType
				? { typeId, count: sourceIds.length, sourceIds, resolvedType }
				: null;
		})
		.filter(
			(
				item,
			): item is {
				typeId: number;
				count: number;
				sourceIds: number[];
				resolvedType: ResolvedType;
			} => item !== null,
		);

	const maxValue = sorted[0]?.count ?? 0;
	const cutoff = 50;
	const currentLimit = Math.min(displayLimit, sorted.length);
	const hasMore = sorted.length > currentLimit;
	const remaining = sorted.length - currentLimit;

	const selectedItem = sorted[selectedIndex];

	return (
		<Stack
			sx={{ flexDirection: "row", alignItems: "flex-start", height: "100%" }}
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
						{sorted
							.slice(0, currentLimit)
							.map(({ typeId, count, resolvedType }, index) => (
								<ListItemButton
									selected={index === selectedIndex}
									onClick={(event) => handleListItemClick(event, index)}
									key={typeId}
									sx={{ width: "100%" }}
								>
									<ListItemText>
										<Stack sx={{ flexGrow: 1 }} gap={0}>
											<TypeSummary resolvedType={resolvedType} />
											<Stack gap={0.5}>
												<InlineBarGraph
													label={`${count.toLocaleString()} ${unit}`}
													width={`${(count / maxValue) * 100}%`}
												/>
											</Stack>
										</Stack>
									</ListItemText>
								</ListItemButton>
							))}
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
				<Stack gap={3}>
					<DisplayRecursiveType
						id={selectedItem?.typeId ?? 0}
						typeRegistry={typeRegistry}
					/>

					{selectedItem && selectedItem.sourceIds.length > 0 && (
						<>
							<Divider />
							<Stack gap={1}>
								<Typography variant="h6">
									Instantiated by {selectedItem.sourceIds.length} type
									{selectedItem.sourceIds.length !== 1 ? "s" : ""}:
								</Typography>
								<List dense>
									{selectedItem.sourceIds.map((sourceId) => {
										const sourceType = typeRegistry.get(sourceId);
										return sourceType ? (
											<ListItem key={sourceId}>
												<TypeSummary resolvedType={sourceType} />
											</ListItem>
										) : null;
									})}
								</List>
							</Stack>
						</>
					)}
				</Stack>
			</Box>
		</Stack>
	);
}
