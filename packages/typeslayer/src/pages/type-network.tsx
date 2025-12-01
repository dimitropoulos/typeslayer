import { Graph } from "@cosmos.gl/graph";
import { FilterList } from "@mui/icons-material";
import {
	Box,
	Button,
	Checkbox,
	Divider,
	FormControlLabel,
	Popover,
	Stack,
	Switch,
	TextField,
	Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import type { ResolvedType, TypeRegistry } from "@typeslayer/validate";
import { useCallback, useEffect, useRef, useState } from "react";
import { DisplayRecursiveType } from "../components/display-recursive-type";
import { useTypesJson } from "../hooks/tauri-hooks";

type EdgeKind =
	| "union"
	| "typeArgument"
	| "instantiated"
	| "substitutionBase"
	| "constraint"
	| "indexedAccessObject"
	| "indexedAccessIndex"
	| "conditionalCheck"
	| "conditionalExtends"
	| "conditionalTrue"
	| "conditionalFalse"
	| "keyof"
	| "evolvingArrayElement"
	| "evolvingArrayFinal"
	| "reverseMappedSource"
	| "reverseMappedMapped"
	| "reverseMappedConstraint"
	| "alias"
	| "aliasTypeArgument"
	| "intersection";

type EdgeConfig = {
	id: EdgeKind;
	colorRGB: [number, number, number];
	color: string;
	label: string;
};

// Ranking provided by user, highest to lowest
const EDGE_RANKING: EdgeKind[] = [
	"union",
	"intersection",
	"typeArgument",
	"instantiated",
	"aliasTypeArgument",
	"conditionalCheck",
	"conditionalExtends",
	"conditionalFalse",
	"conditionalTrue",
	"indexedAccessObject",
	"indexedAccessIndex",
	"keyof",
	"reverseMappedSource",
	"reverseMappedMapped",
	"reverseMappedConstraint",
	"substitutionBase",
	"constraint",
	"evolvingArrayElement",
	"evolvingArrayFinal",
	"alias",
];

// Color palette preference groups:
// Top 3: R, G, B
// Next 3: Y, M, C
// Next groups of 3: high-visibility tertiary variants
const EDGE_COLORS_HEX: string[] = [
	"#ff0000", // R
	"#00ff00", // G
	"#0000ff", // B
	"#ffff00", // Y
	"#ff00ff", // M
	"#00ffff", // C
	"#ff8000", // orange
	"#8000ff", // violet
	"#00ff80", // spring green
	"#ff8080", // light red
	"#80ff00", // chartreuse
	"#0080ff", // azure
	"#808080", // gray
	"#b3b300", // olive
	"#00b3b3", // teal
	"#ffbf00", // amber
	"#bf00ff", // purple
	"#00ffbf", // aquamarine
	"#ff4000", // vermilion
	"#00bfFF", // sky
];

const EDGE_LABELS: Record<EdgeKind, string> = {
	union: "Union",
	intersection: "Intersection",
	typeArgument: "Type Argument",
	instantiated: "Instantiated",
	aliasTypeArgument: "Alias Type Argument",
	conditionalCheck: "Conditional Check",
	conditionalExtends: "Conditional Extends",
	conditionalFalse: "Conditional False",
	conditionalTrue: "Conditional True",
	indexedAccessObject: "Indexed Access Object",
	indexedAccessIndex: "Indexed Access Index",
	keyof: "Keyof",
	reverseMappedSource: "Reverse Mapped Source",
	reverseMappedMapped: "Reverse Mapped Mapped",
	reverseMappedConstraint: "Reverse Mapped Constraint",
	substitutionBase: "Substitution Base",
	constraint: "Constraint",
	evolvingArrayElement: "Evolving Array Element",
	evolvingArrayFinal: "Evolving Array Final",
	alias: "Alias",
};

const EDGE_CONFIGS: EdgeConfig[] = EDGE_RANKING.map((id, i) => {
	const hex = EDGE_COLORS_HEX[i % EDGE_COLORS_HEX.length];
	// convert hex to RGB 0..1
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	return {
		id,
		colorRGB: [r, g, b],
		color: hex,
		label: EDGE_LABELS[id],
	};
});

const EDGE_CONFIG_MAP = new Map(EDGE_CONFIGS.map((cfg) => [cfg.id, cfg]));

const StatPill = ({ label, value }: { label: string; value: number }) => (
	<Box
		sx={{
			display: "flex",
			alignItems: "baseline",
			gap: 1,
			px: 1.25,
			py: 0.5,
			border: (t) => `1px solid ${t.palette.primary.main}80`,
		}}
	>
		<Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
			{value.toLocaleString()}
		</Typography>
		<Typography
			variant="caption"
			sx={{ textTransform: "uppercase", letterSpacing: 1 }}
		>
			{label}
		</Typography>
	</Box>
);

type CosmosNode = { id: string; name: string };
type CosmosLink = { source: string; target: string; kind: EdgeKind };
type GraphData = { nodes: CosmosNode[]; links: CosmosLink[] };

type ForceGraphNode = { id: number; name: string };
type ForceGraphLink = { source: number; target: number; kind: EdgeKind };
type GraphStats = { count: Record<string, number> };
type ForceGraphData = {
	nodes: ForceGraphNode[];
	links: ForceGraphLink[];
	stats: GraphStats;
};

export const TypeNetwork = () => {
	const containerRef = useRef<HTMLDivElement>(null);
	const graphRef = useRef<Graph | null>(null);
	const cosmosDataRef = useRef<GraphData | null>(null);
	const [loading, setLoading] = useState(true);
	const [stats, setStats] = useState<{ nodes: number; links: number } | null>(
		null,
	);
	const [visibleStats, setVisibleStats] = useState<{
		nodes: number;
		links: number;
	} | null>(null);
	const [edgeStats, setEdgeStats] = useState<Record<string, number>>({});

	const [paused, setPaused] = useState(false);
	const pausedRef = useRef(paused);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
	const selectedIndexRef = useRef<number | null>(null);
	const handlePointClickRef = useRef<((index: number) => void) | null>(null);
	const applySelectionVisualsRef = useRef<
		((index: number | null) => void) | null
	>(null);
	const [zoomId, setZoomId] = useState<string>("");
	const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
	const [activeFilters, setActiveFilters] = useState<Set<EdgeKind>>(
		new Set(EDGE_CONFIGS.map((c) => c.id)),
	);
	const idToIndexRef = useRef<Map<string, number>>(new Map());
	const kindsBufferRef = useRef<EdgeKind[]>([]);
	const linkPairsRef = useRef<Float32Array | null>(null);
	const allLinksRef = useRef<CosmosLink[]>([]);
	const originalPositionsRef = useRef<Float32Array | null>(null);
	const hiddenIndicesRef = useRef<Set<number>>(new Set());
	const [showFreeTypes, setShowFreeTypes] = useState(true);
	const [sidebarWidth, setSidebarWidth] = useState(35); // percentage
	const [isResizing, setIsResizing] = useState(false);
	const spaceHoldRef = useRef({ active: false, previous: false });
	const typesJson = useTypesJson();
	const typeRegistry: TypeRegistry = new Map<number, ResolvedType>(
		((typesJson.data ?? []) as ResolvedType[]).map((t) => [t.id, t]),
	);

	useEffect(() => {
		pausedRef.current = paused;
	}, [paused]);

	const setSimulationPaused = useCallback((nextPaused: boolean) => {
		const g = graphRef.current;
		if (!g) return;
		if (nextPaused === pausedRef.current) return;
		if (nextPaused) {
			g.pause?.();
		} else {
			g.unpause?.();
		}
		setPaused(nextPaused);
		pausedRef.current = nextPaused;
	}, []);

	const applySelectionVisuals = (selectedIndex: number | null) => {
		const g = graphRef.current as unknown as {
			setPointColors?: (colors: Float32Array) => void;
			setPointSizes?: (sizes: Float32Array) => void;
			setLinkWidths?: (widths: Float32Array) => void;
			setLinkColors?: (colors: Float32Array) => void;
			render?: () => void;
		} | null;
		const data = cosmosDataRef.current;
		if (!g || !data) return;

		const n = data.nodes.length;
		const pointColors = new Float32Array(n * 4);
		const pointSizes = new Float32Array(n);
		const hidden = hiddenIndicesRef.current;
		// Base visuals: neutral grey for all nodes
		for (let i = 0; i < n; i++) {
			pointColors[i * 4] = 0.6;
			pointColors[i * 4 + 1] = 0.6;
			pointColors[i * 4 + 2] = 0.6;
			// Respect hidden alpha when showFreeTypes is OFF
			pointColors[i * 4 + 3] = !showFreeTypes && hidden.has(i) ? 0.0 : 1.0;
			pointSizes[i] = 3; // base size (scales with zoom)
		}

		// Build link widths and colors if API exists
		const linkPairs = linkPairsRef.current;
		const kindsBuffer = kindsBufferRef.current;
		const linkCount = linkPairs ? linkPairs.length / 2 : 0;
		const linkWidths = linkCount ? new Float32Array(linkCount) : null;
		const linkColors = linkCount ? new Float32Array(linkCount * 4) : null;
		if (linkWidths) linkWidths.fill(1);

		// Set base link colors from kinds
		if (linkColors) {
			for (let i = 0; i < linkCount; i++) {
				const kind = kindsBuffer[i];
				const config = EDGE_CONFIG_MAP.get(kind);
				const [r, g, b] = config?.colorRGB ?? [0.5, 0.5, 0.5];
				linkColors[i * 4] = r;
				linkColors[i * 4 + 1] = g;
				linkColors[i * 4 + 2] = b;
				linkColors[i * 4 + 3] = 1;
			}
		}

		if (selectedIndex != null) {
			// Selected node visuals: white, same size
			pointColors[selectedIndex * 4] = 1.0;
			pointColors[selectedIndex * 4 + 1] = 1.0;
			pointColors[selectedIndex * 4 + 2] = 1.0;
			pointColors[selectedIndex * 4 + 3] = 1.0;

			// Neighbors => much lighter grey; incident links => width*2, full color
			// Non-incident links => muted (reduce alpha)
			if (linkPairs) {
				for (let i = 0; i < linkCount; i++) {
					const s = (linkPairs[i * 2] | 0) as number;
					const t = (linkPairs[i * 2 + 1] | 0) as number;
					const isIncident = s === selectedIndex || t === selectedIndex;

					if (isIncident) {
						const other: number = s === selectedIndex ? t : s;
						// neighbor color only if not the selected index
						if (other !== selectedIndex) {
							// Much lighter grey for neighbors
							pointColors[other * 4] = 0.9;
							pointColors[other * 4 + 1] = 0.9;
							pointColors[other * 4 + 2] = 0.9;
							// preserve alpha for hidden nodes
							if (!(!showFreeTypes && hidden.has(other))) {
								pointColors[other * 4 + 3] = 1.0;
							}
						}
						if (linkWidths) linkWidths[i] = 2;
						// Keep incident links at full color (alpha already 1)
					} else {
						// Mute non-incident links
						if (linkColors) {
							linkColors[i * 4 + 3] = 0.15;
						}
					}
				}
			}
		}

		g.setPointColors?.(pointColors);
		g.setPointSizes?.(pointSizes);
		if (linkWidths)
			(
				g as unknown as { setLinkWidths?: (w: Float32Array) => void }
			).setLinkWidths?.(linkWidths);
		if (linkColors) g.setLinkColors?.(linkColors);
		g.render?.();
	};

	// Keep selectedIndexRef in sync
	useEffect(() => {
		selectedIndexRef.current = selectedIndex;
	}, [selectedIndex]);

	// (callbacks refs are assigned after declarations)

	// Stable click handler using refs to avoid re-creating graph
	const handlePointClick = (index: number) => {
		const data = cosmosDataRef.current;
		if (!data) return;
		const node = data.nodes[index];
		// Toggle selection if clicking the same node
		if (selectedIndexRef.current === index) {
			setSelectedIndex(null);
			setSelectedId(null);
			const g0 = graphRef.current as unknown as {
				unselectPoints?: () => void;
			} | null;
			g0?.unselectPoints?.();
			applySelectionVisuals(null);
			return;
		}
		setSelectedIndex(index);
		setSelectedId(node.id);
		const g = graphRef.current as unknown as {
			selectPointByIndex?: (i: number) => void;
		} | null;
		g?.selectPointByIndex?.(index);
		// Do not change zoom when selecting
		applySelectionVisuals(index);
	};
	// Keep refs pointing to latest callbacks
	handlePointClickRef.current = handlePointClick;
	applySelectionVisualsRef.current = applySelectionVisuals;

	const applyFilters = (
		filters: Set<EdgeKind>,
		showFreeTypesOverride?: boolean,
	) => {
		const g = graphRef.current;
		const cosmosData = cosmosDataRef.current;
		const allLinks = allLinksRef.current;
		if (!g || !cosmosData || allLinks.length === 0) return;

		// Filter links by activeFilters
		const indexById = idToIndexRef.current;
		const filteredLinks = allLinks.filter((l) => filters.has(l.kind));
		const pairBuffer: number[] = [];
		const kindsBuffer: EdgeKind[] = [];
		for (const l of filteredLinks) {
			const s = indexById.get(l.source);
			const t = indexById.get(l.target);
			if (s !== undefined && t !== undefined) {
				pairBuffer.push(s, t);
				kindsBuffer.push(l.kind);
			}
		}
		const linkPairs = new Float32Array(pairBuffer);
		g.setLinks(linkPairs);
		linkPairsRef.current = linkPairs;
		kindsBufferRef.current = kindsBuffer;

		// Filter types if showFreeTypes is false
		let visibleTypeIds: Set<string> | null = null;
		const showFree = showFreeTypesOverride ?? showFreeTypes;
		if (!showFree) {
			const tmp = new Set<string>();
			for (const l of filteredLinks) {
				tmp.add(l.source);
				tmp.add(l.target);
			}
			visibleTypeIds = tmp;
		}

		// Rebuild color array
		const arr = new Float32Array(kindsBuffer.length * 4);
		for (let i = 0; i < kindsBuffer.length; i++) {
			const kind = kindsBuffer[i];
			const config = EDGE_CONFIG_MAP.get(kind);
			const [r, g, b] = config?.colorRGB ?? [0.5, 0.5, 0.5];
			arr[i * 4] = r;
			arr[i * 4 + 1] = g;
			arr[i * 4 + 2] = b;
			arr[i * 4 + 3] = 1;
		}
		g.setLinkColors(arr);

		// Set positions: hide types with no visible links if needed
		const currentPositions = g.getPointPositions();
		const currentCount = cosmosData.nodes.length;

		if (!showFree) {
			// Hide nodes without links in current filter
			// Always capture latest positions before hiding, so we can restore accurately
			originalPositionsRef.current = Float32Array.from(currentPositions);
			const positions = new Float32Array(currentCount * 2);
			const hidden = new Set<number>();
			for (let i = 0; i < currentCount; i++) {
				const id = cosmosData.nodes[i].id;
				if (!visibleTypeIds || !visibleTypeIds.has(id)) {
					positions[i * 2] = 1e6;
					positions[i * 2 + 1] = 1e6;
					hidden.add(i);
				} else {
					positions[i * 2] = currentPositions[i * 2];
					positions[i * 2 + 1] = currentPositions[i * 2 + 1];
				}
			}
			g.setPointPositions(positions);
			hiddenIndicesRef.current = hidden;

			// Also hide points via alpha so they don't render
			const pointColors = new Float32Array(currentCount * 4);
			for (let i = 0; i < currentCount; i++) {
				const isVisible = !hidden.has(i);
				pointColors[i * 4] = 0.6;
				pointColors[i * 4 + 1] = 0.6;
				pointColors[i * 4 + 2] = 0.6;
				pointColors[i * 4 + 3] = isVisible ? 1.0 : 0.0;
			}
			(
				g as unknown as { setPointColors?: (c: Float32Array) => void }
			).setPointColors?.(pointColors);
		} else if (originalPositionsRef.current) {
			// Restore all nodes to their simulation positions when showing free types
			// Restore previously hidden indices to their last-known positions
			const positions = Float32Array.from(currentPositions);
			const orig = originalPositionsRef.current;
			const hidden = hiddenIndicesRef.current;
			if (orig && hidden.size > 0) {
				for (const i of hidden) {
					positions[i * 2] = orig[i * 2];
					positions[i * 2 + 1] = orig[i * 2 + 1];
				}
				g.setPointPositions(positions);
			}
			hiddenIndicesRef.current.clear();

			// Ensure all points are visible again
			const pointColors = new Float32Array(currentCount * 4);
			for (let i = 0; i < currentCount; i++) {
				pointColors[i * 4] = 0.6;
				pointColors[i * 4 + 1] = 0.6;
				pointColors[i * 4 + 2] = 0.6;
				pointColors[i * 4 + 3] = 1.0;
			}
			(
				g as unknown as { setPointColors?: (c: Float32Array) => void }
			).setPointColors?.(pointColors);
		}
		g.render();

		const visibleNodeCount = showFree
			? cosmosData.nodes.length
			: (visibleTypeIds?.size ?? 0);
		setVisibleStats({
			nodes: visibleNodeCount,
			links: filteredLinks.length,
		});

		// Re-apply selection visuals if a node is selected
		if (selectedId) {
			const idx = idToIndexRef.current.get(selectedId);
			applySelectionVisuals(idx ?? null);
		}

		// no-op for removed debug view info
	};

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.code !== "Space") return;
			if (spaceHoldRef.current.active) {
				e.preventDefault();
				return;
			}
			e.preventDefault();
			spaceHoldRef.current = {
				active: true,
				previous: pausedRef.current,
			};
			if (pausedRef.current) {
				setSimulationPaused(false);
			} else {
				setSimulationPaused(true);
			}
		};

		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.code !== "Space" || !spaceHoldRef.current.active) return;
			e.preventDefault();
			const prev = spaceHoldRef.current.previous;
			spaceHoldRef.current = { active: false, previous: prev };
			setSimulationPaused(prev);
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, [setSimulationPaused]);

	useEffect(() => {
		let graph: Graph | null = null;

		(async () => {
			try {
				await invoke("build_type_graph");
			} catch (e) {
				console.warn("build_type_graph failed (continuing):", e);
			}
			try {
				const res = await invoke<ForceGraphData>("get_type_graph");
				console.log("Graph data received:", res);

				if (!containerRef.current) return;

				const cosmosData: GraphData = {
					nodes: res.nodes.map((n) => ({ id: String(n.id), name: n.name })),
					links: res.links.map((l) => ({
						source: String(l.source),
						target: String(l.target),
						kind: l.kind,
					})),
				};
				cosmosDataRef.current = cosmosData;
				allLinksRef.current = cosmosData.links;
				setEdgeStats(res.stats.count);

				graph = new Graph(containerRef.current, {
					renderLinks: true,
					linkWidth: 1,
					// Base size, scales with zoom when scalePointsOnZoom is true
					pointSize: 3,
					nodeSize: 3,
					scalePointsOnZoom: true,
					linkWidthScale: 0.55,
					scaleLinksOnZoom: true,
					linkColorMode: "rgba",
					renderHoveredPointRing: true,
					hoveredPointRingColor: "#4B5BBF",
					backgroundColor: "#00000000",
					// Add direct handlers if supported
					onPointClick: (index: number | undefined) => {
						if (index === undefined) return;
						handlePointClickRef.current?.(index);
					},
					onBackgroundClick: () => {
						setSelectedId(null);
						setSelectedIndex(null);
						const g = graphRef.current as unknown as {
							unselectPoints?: () => void;
						} | null;
						g?.unselectPoints?.();
						applySelectionVisualsRef.current?.(null);
					},
					// Keep events object for compatibility with older API shapes
					events: {
						onClick: (index: number | undefined) => {
							if (index === undefined) return;
							handlePointClickRef.current?.(index);
						},
						onPointClick: (index: number | undefined) => {
							if (index === undefined) return;
							handlePointClickRef.current?.(index);
						},
					},
				});
				graphRef.current = graph;

				const nodeCount = cosmosData.nodes.length;
				// Seed positions near observed settled center to reduce early drift
				const positions = new Float32Array(nodeCount * 2);
				const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
				const BASE_CENTER_X = 4150.6;
				const BASE_CENTER_Y = 4150.3;
				const R = 1300; // approx half of observed extent
				for (let i = 0; i < nodeCount; i++) {
					const t = i + 1;
					const angle = t * GOLDEN_ANGLE;
					const r = Math.sqrt(t / nodeCount) * R;
					positions[i * 2] = BASE_CENTER_X + Math.cos(angle) * r;
					positions[i * 2 + 1] = BASE_CENTER_Y + Math.sin(angle) * r;
				}
				graph.setPointPositions(positions);

				const indexById = new Map<string, number>();
				for (let i = 0; i < nodeCount; i++)
					indexById.set(cosmosData.nodes[i].id, i);
				idToIndexRef.current = indexById;

				const pairBuffer: number[] = [];
				const kindsBuffer: EdgeKind[] = [];
				for (const l of cosmosData.links) {
					const s = indexById.get(l.source);
					const t = indexById.get(l.target);
					if (s !== undefined && t !== undefined) {
						pairBuffer.push(s, t);
						kindsBuffer.push(l.kind);
					}
				}
				const linkPairs = new Float32Array(pairBuffer);
				graph.setLinks(linkPairs);
				linkPairsRef.current = linkPairs;

				// Store kinds for color application (use filtered buffer that matches setLinks)
				kindsBufferRef.current = kindsBuffer;

				// Start simulation first to initialize internal state
				graph.start();

				// Build color array for links
				let colorArray: Float32Array | null = null;
				if (kindsBuffer.length > 0) {
					const arr = new Float32Array(kindsBuffer.length * 4);
					for (let i = 0; i < kindsBuffer.length; i++) {
						const kind = kindsBuffer[i];
						const config = EDGE_CONFIG_MAP.get(kind);
						const [r, g, b] = config?.colorRGB ?? [0.5, 0.5, 0.5];

						arr[i * 4] = r;
						arr[i * 4 + 1] = g;
						arr[i * 4 + 2] = b;
						arr[i * 4 + 3] = 1;
					}
					colorArray = arr;
				}

				// Render and apply colors after initial frame
				requestAnimationFrame(() => {
					const g = graphRef.current;
					if (g) {
						g.render();
						// No camera recenter to avoid flashing; let simulation settle
						// Apply colors after render is complete
						if (colorArray) {
							g.setLinkColors(colorArray);
							console.log(
								"[TypeNetwork] setLinkColors called AFTER render with array of length",
								colorArray.length,
							);
							g.render(); // render again with colors
						}
					}
				});

				setStats({
					nodes: cosmosData.nodes.length,
					links: cosmosData.links.length,
				});
				setVisibleStats({
					nodes: cosmosData.nodes.length,
					links: cosmosData.links.length,
				});
				setLoading(false);
			} catch (e) {
				console.error("get_type_graph failed:", e);
				setLoading(false);
			}
		})();

		return () => {
			graph?.destroy();
		};
	}, []);

	// Handle resize drag
	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!isResizing) return;
			const containerWidth = window.innerWidth;
			const newWidth = ((containerWidth - e.clientX) / containerWidth) * 100;
			// Clamp between 20% and 80%
			setSidebarWidth(Math.max(20, Math.min(80, newWidth)));
		};

		const handleMouseUp = () => {
			setIsResizing(false);
		};

		if (isResizing) {
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
			return () => {
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
			};
		}
	}, [isResizing]);

	return (
		<Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
			<Box sx={{ py: 2, px: 4 }}>
				<Stack direction="row" spacing={2} alignItems="flex-end">
					<TextField
						placeholder="Zoom to Type ID"
						size="small"
						value={zoomId}
						onChange={(e) => setZoomId(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								const idx = idToIndexRef.current.get(zoomId);
								const g = graphRef.current as unknown as {
									zoomToPointByIndex?: (index: number, scale?: number) => void;
								} | null;
								if (g && idx !== undefined) g.zoomToPointByIndex?.(idx, 1.5);
							}
						}}
					/>
					<Button
						variant="outlined"
						startIcon={<FilterList />}
						onClick={(e) => setFilterAnchor(e.currentTarget)}
					>
						Filter Links
					</Button>
					<Button
						variant="contained"
						onClick={() => {
							setSimulationPaused(!pausedRef.current);
						}}
					>
						{paused ? "Resume" : "Pause"}
					</Button>

					<FormControlLabel
						control={
							<Switch
								checked={showFreeTypes}
								onChange={(_, checked) => {
									setShowFreeTypes(checked);
									// Reapply filters using the latest toggle value (avoid stale state)
									applyFilters(activeFilters, checked);
								}}
								color="primary"
							/>
						}
						label={"Show Unlinked Types"}
					/>
					<span style={{ flex: 1 }} />
					{(() => {
						const statsToRender = visibleStats ?? stats;
						if (!statsToRender) return null;
						return (
							<Stack direction="row" spacing={1}>
								<StatPill label="types" value={statsToRender.nodes} />
								<StatPill label="links" value={statsToRender.links} />
							</Stack>
						);
					})()}
				</Stack>
				{loading && <p>Loading graph…</p>}
			</Box>
			<Popover
				open={Boolean(filterAnchor)}
				anchorEl={filterAnchor}
				onClose={() => setFilterAnchor(null)}
				anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
				disableScrollLock
				slotProps={{
					paper: {
						onMouseLeave: () => setFilterAnchor(null),
					},
				}}
			>
				<Box
					sx={{
						width: 320,
						display: "flex",
						flexDirection: "column",
						position: "relative",
					}}
				>
					<Box sx={{ p: 2, maxHeight: 500, overflowY: "auto" }}>
						<Typography variant="h6" sx={{ mb: 2 }}>
							Link Types
						</Typography>
						<Stack spacing={1}>
							{EDGE_CONFIGS.map(
								(config) => [config, edgeStats[config.id] ?? 0] as const,
							)
								.sort((a, b) => b[1] - a[1])
								.map(([config, count], index, arr) => {
									const isFirstZero =
										count === 0 && (index === 0 || arr[index - 1][1] > 0);
									return (
										<div key={config.id}>
											{isFirstZero && <Divider sx={{ my: 1 }} />}
											<FormControlLabel
												control={
													<Checkbox
														checked={activeFilters.has(config.id)}
														onChange={(e) => {
															const newFilters = new Set(activeFilters);
															if (e.target.checked) {
																newFilters.add(config.id);
															} else {
																newFilters.delete(config.id);
															}
															setActiveFilters(newFilters);
															applyFilters(newFilters, showFreeTypes);
														}}
													/>
												}
												label={
													<Stack
														direction="row"
														spacing={1}
														alignItems="center"
													>
														<Box
															sx={{
																width: 16,
																height: 16,
																bgcolor: config.color,
															}}
														/>
														<Typography variant="body2">
															{config.label}
															<span style={{ color: "#888", marginLeft: 4 }}>
																({count.toLocaleString()})
															</span>
														</Typography>
													</Stack>
												}
											/>
										</div>
									);
								})}
						</Stack>
					</Box>
					<Box
						sx={{
							position: "sticky",
							bottom: 0,
							left: 0,
							right: 0,
							bgcolor: "background.paper",
							p: 2,
							borderTop: "1px solid #eee",
							zIndex: 1,
							display: "flex",
							gap: 2,
							justifyContent: "center",
						}}
					>
						<Button
							variant="contained"
							size="small"
							onClick={() => {
								const all = new Set(EDGE_CONFIGS.map((c) => c.id));
								setActiveFilters(all);
								applyFilters(all, showFreeTypes);
							}}
						>
							ALL
						</Button>
						<Button
							variant="outlined"
							size="small"
							onClick={() => {
								const none = new Set<EdgeKind>();
								setActiveFilters(none);
								applyFilters(none, showFreeTypes);
							}}
						>
							NONE
						</Button>
					</Box>
				</Box>
			</Popover>
			<Box sx={{ flex: 1, position: "relative", minHeight: 0 }}>
				<div
					ref={containerRef}
					style={{
						position: "absolute",
						inset: 0,
					}}
				/>
				{selectedId && (
					<Box
						sx={{
							position: "absolute",
							top: 0,
							right: 0,
							bottom: 0,
							width: `${sidebarWidth}%`,
							bgcolor: "background.paper",
							borderLeft: "1px solid",
							borderColor: "divider",
							p: 2,
							overflow: "auto",
							zIndex: 10,
						}}
					>
						<Box
							onMouseDown={() => setIsResizing(true)}
							sx={{
								position: "absolute",
								left: -4,
								top: 0,
								bottom: 0,
								width: 8,
								cursor: "ew-resize",
								zIndex: 11,
								"&:hover": {
									bgcolor: "primary.main",
									opacity: 0.3,
								},
							}}
						/>
						{typeRegistry.size > 0 ? (
							<DisplayRecursiveType
								id={Number(selectedId)}
								typeRegistry={typeRegistry}
							/>
						) : (
							<Typography variant="body2" color="text.secondary">
								Loading type details…
							</Typography>
						)}
					</Box>
				)}
			</Box>
		</Box>
	);
};
