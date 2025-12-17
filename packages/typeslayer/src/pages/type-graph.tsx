import { Graph } from "@cosmos.gl/graph";
import {
  FilterCenterFocus,
  FilterList,
  Pause,
  PlayArrow,
  Search,
  Share,
  ZoomOutMap,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Popover,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "@tanstack/react-router";
import type { TypeId } from "@typeslayer/validate";
import { useCallback, useEffect, useRef, useState } from "react";
import { CenterLoader } from "../components/center-loader";
import { DisplayRecursiveType } from "../components/display-recursive-type";
import { NoData } from "../components/no-data";
import { StatPill } from "../components/stat-pill";
import {
  useTypeGraphNodesAndLinks,
  useTypeGraphStats,
} from "../hooks/tauri-hooks";
import type { GraphLink, LinkKind } from "../types/type-graph";

type EdgeConfig = {
  id: LinkKind;
  colorRGB: [number, number, number];
  color: string;
  label: string;
};

// Ranking provided by user, highest to lowest
const EDGE_RANKING: LinkKind[] = [
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
  "#ff0000", // red
  "#00ff00", // green
  "#0000ff", // blue
  "#ffff00", // yellow
  "#ff00ff", // majenta
  "#00ffff", // cyan
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

const EDGE_LABELS: Record<LinkKind, string> = {
  union: "Union",
  intersection: "Intersection",
  typeArgument: "Type Argument",
  instantiated: "Instantiated",
  aliasTypeArgument: "Generic Argument",
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

const EDGE_CONFIG_MAP = new Map(EDGE_CONFIGS.map(cfg => [cfg.id, cfg]));

export const TypeGraph = () => {
  const params = useParams({ strict: false });
  const selectedTypeId = params.typeId as string | undefined;

  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const [visibleStats, setVisibleStats] = useState<{
    nodes: number;
    links: number;
  } | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const handlePointClickRef = useRef<((index: number) => void) | null>(null);
  const applySelectionVisualsRef = useRef<
    ((index: number | null) => void) | null
  >(null);

  const kindsBufferRef = useRef<LinkKind[]>([]);
  const linkPairsRef = useRef<Float32Array | null>(null);
  const allLinksRef = useRef<GraphLink[]>([]);
  const hiddenIndicesRef = useRef<Set<number>>(new Set());
  const [showFreeTypes, setShowFreeTypes] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(35); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const [graphReady, setGraphReady] = useState(false);
  const spaceHoldRef = useRef({ active: false, previous: false });
  const { data: typeGraph, isLoading: isTypeGraphLoading } =
    useTypeGraphNodesAndLinks();

  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  const isLoading = isTypeGraphLoading;

  const hasTypes = typeof typeGraph?.nodes === "number" && typeGraph.nodes > 0;

  const hasData = typeGraph !== undefined && hasTypes;

  const setSimulationPaused = useCallback((nextPaused: boolean) => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }
    if (nextPaused === pausedRef.current) {
      return;
    }
    if (nextPaused) {
      graph.pause();
    } else {
      graph.unpause();
    }
    setPaused(nextPaused);
    pausedRef.current = nextPaused;
  }, []);

  // Handle typeId route parameter: select/unselect the type
  useEffect(() => {
    if (!selectedTypeId) {
      // Clear selection when search box is empty
      setSelectedIndex(null);
      setSelectedId(null);
      graphRef.current?.unselectPoints();
      applySelectionVisualsRef.current?.(null);
      return;
    }

    if (!graphReady || !graphRef.current || !typeGraph) {
      return;
    }

    const typeId = Number.parseInt(selectedTypeId, 10);
    if (typeId !== undefined) {
      setSelectedId(typeId);
      setSelectedIndex(typeId);
      applySelectionVisualsRef.current?.(typeId);
      graphRef.current.zoomToPointByIndex(typeId, 1.5);
    }
  }, [selectedTypeId, graphReady, typeGraph]);

  const applySelectionVisuals = useCallback(
    (selectedIndex: number | null) => {
      const graph = graphRef.current;
      if (!graph || !typeGraph) {
        return;
      }

      const { nodes } = typeGraph;
      const pointColors = new Float32Array(nodes * 4);
      const pointSizes = new Float32Array(nodes);
      const hidden = hiddenIndicesRef.current;

      // Base visuals: neutral grey for all nodes
      for (let i = 0; i < nodes; i++) {
        pointColors[i * 4] = 0.6;
        pointColors[i * 4 + 1] = 0.6;
        pointColors[i * 4 + 2] = 0.6;
        // Respect hidden alpha when showFreeTypes is OFF
        pointColors[i * 4 + 3] = !showFreeTypes && hidden.has(i) ? 0.0 : 1.0;
        pointSizes[i] = 2; // base size (scales with zoom)
      }

      // Build link widths and colors if API exists
      const linkPairs = linkPairsRef.current;
      const kindsBuffer = kindsBufferRef.current;
      const linkCount = linkPairs ? linkPairs.length / 2 : 0;
      const linkWidths = linkCount ? new Float32Array(linkCount) : null;
      const linkColors = linkCount ? new Float32Array(linkCount * 4) : null;
      if (linkWidths) {
        linkWidths.fill(1);
      }

      // Set base link colors from kinds (default to muted)
      if (linkColors) {
        for (let i = 0; i < linkCount; i++) {
          const kind = kindsBuffer[i];
          const config = EDGE_CONFIG_MAP.get(kind);
          const [r, g, b] = config?.colorRGB ?? [0.5, 0.5, 0.5];
          linkColors[i * 4] = r;
          linkColors[i * 4 + 1] = g;
          linkColors[i * 4 + 2] = b;
          linkColors[i * 4 + 3] = 0.8; // alpha
        }
      }

      if (selectedIndex != null) {
        // Track which nodes are connected to selected node
        const connectedIndices = new Set<number>();
        connectedIndices.add(selectedIndex);

        // Selected node visuals: white, same size
        pointColors[selectedIndex * 4] = 1.0;
        pointColors[selectedIndex * 4 + 1] = 1.0;
        pointColors[selectedIndex * 4 + 2] = 1.0;
        pointColors[selectedIndex * 4 + 3] = 1.0;

        // Track incident links per neighbor to decide color
        // neighborLinkColors[neighborIndex] = [r, g, b, linkCount]
        const neighborLinkColors = new Map<
          number,
          { r: number; g: number; b: number; count: number }
        >();

        // Neighbors => color from link (if single link) or white (if multiple); incident links => width*2, full opacity
        // Non-incident links => mute heavily
        if (linkPairs) {
          for (let i = 0; i < linkCount; i++) {
            const s = (linkPairs[i * 2] | 0) as number;
            const t = (linkPairs[i * 2 + 1] | 0) as number;
            const isIncident = s === selectedIndex || t === selectedIndex;

            if (isIncident) {
              const other: number = s === selectedIndex ? t : s;
              connectedIndices.add(other);

              // Track link color for this neighbor
              if (other !== selectedIndex) {
                const linkR = linkColors ? linkColors[i * 4] : 1.0;
                const linkG = linkColors ? linkColors[i * 4 + 1] : 1.0;
                const linkB = linkColors ? linkColors[i * 4 + 2] : 1.0;

                if (!neighborLinkColors.has(other)) {
                  neighborLinkColors.set(other, {
                    r: linkR,
                    g: linkG,
                    b: linkB,
                    count: 1,
                  });
                } else {
                  const existing = neighborLinkColors.get(other);
                  if (existing) {
                    existing.count += 1;
                  }
                }
              }

              if (linkWidths) {
                linkWidths[i] = 2;
              }
              // Set incident links to full opacity
              if (linkColors) {
                linkColors[i * 4 + 3] = 1.0;
              }
            } else {
              // Mute non-incident links
              if (linkColors) {
                linkColors[i * 4 + 3] = 0.05;
              }
            }
          }

          // Now apply neighbor colors based on link count
          for (const [neighborIndex, linkInfo] of neighborLinkColors) {
            if (linkInfo.count === 1) {
              // Single link: use link color
              pointColors[neighborIndex * 4] = linkInfo.r;
              pointColors[neighborIndex * 4 + 1] = linkInfo.g;
              pointColors[neighborIndex * 4 + 2] = linkInfo.b;
            } else {
              // Multiple links: use white
              pointColors[neighborIndex * 4] = 1.0;
              pointColors[neighborIndex * 4 + 1] = 1.0;
              pointColors[neighborIndex * 4 + 2] = 1.0;
            }
            pointColors[neighborIndex * 4 + 3] = 1.0;
          }
        }

        // Significantly mute non-connected nodes
        for (let i = 0; i < nodes; i++) {
          if (!connectedIndices.has(i)) {
            pointColors[i * 4 + 3] = 0.15; // Reduce opacity to 15%
          }
        }
      }

      graph.setPointColors(pointColors);
      graph.setPointSizes(pointSizes);
      if (linkWidths) {
        graph.setLinkWidths(linkWidths);
      }
      if (linkColors) {
        graph.setLinkColors(linkColors);
      }
      graph.render();
    },
    [showFreeTypes, typeGraph],
  );

  // (callbacks refs are assigned after declarations)

  // Stable click handler using refs to avoid re-creating graph
  const handlePointClick = useCallback(
    (typeId: TypeId) => {
      if (!typeGraph) {
        return;
      }

      // Toggle selection if clicking the same node
      if (selectedIndex === typeId) {
        navigate({ to: "/type-graph" });
      } else {
        navigate({ to: `/type-graph/${typeId}` });
      }
    },
    [typeGraph, navigate, selectedIndex],
  );

  // Keep refs pointing to latest callbacks
  handlePointClickRef.current = handlePointClick;
  applySelectionVisualsRef.current = applySelectionVisuals;

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.code !== "Space") {
        return;
      }
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

    const handleKeyUp = (e: globalThis.KeyboardEvent) => {
      if (e.code !== "Space" || !spaceHoldRef.current.active) {
        return;
      }
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
      if (!typeGraph) {
        return;
      }

      setGraphReady(false);

      try {
        const { nodes, links } = typeGraph;

        if (!containerRef.current) {
          return;
        }

        allLinksRef.current = links;

        graph = new Graph(containerRef.current, {
          renderLinks: true,
          linkWidth: 1,
          pointSize: 3,
          scalePointsOnZoom: true,
          linkWidthScale: 0.55,
          scaleLinksOnZoom: true,
          linkOpacity: 1.0, // Ensure links render at full opacity (multiplies with alpha in linkColors)
          renderHoveredPointRing: true,
          hoveredPointRingColor: "#4B5BBF",
          backgroundColor: "#00000000",
          onPointClick: (index: number | undefined) => {
            if (index === undefined) {
              return;
            }
            handlePointClickRef.current?.(index);
          },
          onBackgroundClick: () => {
            navigateRef.current({ to: "/type-graph" });
          },
        });
        graphRef.current = graph;

        const nodeCount = nodes;
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

        const pairBuffer: number[] = [];
        const kindsBuffer: LinkKind[] = [];
        for (const link of links) {
          if (link.source !== undefined && link.target !== undefined) {
            pairBuffer.push(link.source, link.target);
            kindsBuffer.push(link.kind);
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
          const graph = graphRef.current;
          if (graph) {
            graph.render();
            // No camera recenter to avoid flashing; let simulation settle
            // Apply colors after render is complete
            if (colorArray) {
              graph.setLinkColors(colorArray);
              console.log(
                "[TypeGraph] setLinkColors called AFTER render with array of length",
                colorArray.length,
              );
              graph.render(); // render again with colors
            }
          }
        });

        setVisibleStats({
          nodes: nodes,
          links: links.length,
        });
        setGraphReady(true);
      } catch (e) {
        console.error("get_type_graph failed:", e);
      }
    })();

    return () => {
      graph?.destroy();
    };
  }, [typeGraph]);

  // Handle resize drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) {
        return;
      }
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

  const graphView = (
    <>
      <TypeGraphUtilityPanel
        setShowFreeTypes={setShowFreeTypes}
        showFreeTypes={showFreeTypes}
        graphReady={graphReady}
        selectedIndex={selectedIndex}
        selectedId={selectedId}
        graphRef={graphRef}
        containerRef={containerRef}
        linkPairsRef={linkPairsRef}
        kindsBufferRef={kindsBufferRef}
        allLinksRef={allLinksRef}
        hiddenIndicesRef={hiddenIndicesRef}
        applySelectionVisuals={applySelectionVisuals}
        setVisibleStats={setVisibleStats}
        selectedTypeId={selectedTypeId}
        setSimulationPaused={setSimulationPaused}
        paused={paused}
        pausedRef={pausedRef}
        visibleStats={visibleStats}
      />
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
            {hasTypes ? (
              <DisplayRecursiveType id={Number(selectedId)} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Loading type details…
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </>
  );

  const noData = (
    <Box sx={{ my: 2, mr: 2 }}>
      <NoData />
    </Box>
  );

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {isLoading ? <CenterLoader /> : hasData ? graphView : noData}
    </Box>
  );
};

const TypeGraphUtilityPanel = ({
  setShowFreeTypes,
  showFreeTypes,
  graphReady,
  selectedIndex,
  selectedId,
  graphRef,
  containerRef,
  linkPairsRef,
  kindsBufferRef,
  allLinksRef,
  hiddenIndicesRef,
  applySelectionVisuals,
  setVisibleStats,
  selectedTypeId,
  setSimulationPaused,
  paused,
  pausedRef,
  visibleStats,
}: {
  setShowFreeTypes: (next: boolean) => void;
  showFreeTypes: boolean;
  graphReady: boolean;
  selectedIndex: number | null;
  selectedId: number | null;
  graphRef: React.RefObject<Graph | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  linkPairsRef: React.RefObject<Float32Array | null>;
  kindsBufferRef: React.RefObject<LinkKind[]>;
  allLinksRef: React.RefObject<GraphLink[]>;
  hiddenIndicesRef: React.RefObject<Set<number>>;
  applySelectionVisuals: (index: number | null) => void;
  setVisibleStats: (stats: { nodes: number; links: number } | null) => void;
  selectedTypeId: string | undefined;
  setSimulationPaused: (nextPaused: boolean) => void;
  paused: boolean;
  pausedRef: React.RefObject<boolean>;
  visibleStats: { nodes: number; links: number } | null;
}) => {
  const { data: typeGraph } = useTypeGraphNodesAndLinks();
  const navigate = useNavigate();
  const originalPositionsRef = useRef<Float32Array | null>(null);
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<LinkKind>>(
    new Set(EDGE_CONFIGS.map(c => c.id)),
  );
  const idToIndexRef = useRef<Map<number, number>>(new Map());

  const focusNode = useCallback(() => {
    if (selectedIndex === null || !graphReady || !graphRef.current) {
      return;
    }
    const graph = graphRef.current;
    const container = containerRef.current;
    if (!graph || !container) {
      return;
    }
    graph.zoomToPointByIndex(selectedIndex, 1.5);
  }, [selectedIndex, graphReady, containerRef.current, graphRef.current]);

  const applyFilters = useCallback(
    (filters: Set<LinkKind>, showFreeTypesOverride?: boolean) => {
      const graph = graphRef.current;
      const allLinks = allLinksRef.current;
      if (!graph || !typeGraph || allLinks.length === 0) {
        return;
      }

      // Filter links by activeFilters
      const filteredLinks = allLinks.filter(link => filters.has(link.kind));
      const pairBuffer: number[] = [];
      const kindsBuffer: LinkKind[] = [];
      for (const link of filteredLinks) {
        if (link.source !== undefined && link.target !== undefined) {
          pairBuffer.push(link.source, link.target);
          kindsBuffer.push(link.kind);
        }
      }
      const linkPairs = new Float32Array(pairBuffer);
      graph.setLinks(linkPairs);
      linkPairsRef.current = linkPairs;
      kindsBufferRef.current = kindsBuffer;

      // Filter types if showFreeTypes is false
      let visibleTypeIds: Set<number> | null = null;
      const showFree = showFreeTypesOverride ?? showFreeTypes;
      if (!showFree) {
        const tmp = new Set<number>();
        for (const link of filteredLinks) {
          tmp.add(link.source);
          tmp.add(link.target);
        }
        visibleTypeIds = tmp;
      }

      // Always rebuild link colors to match current filters and links
      const arr = new Float32Array(kindsBuffer.length * 4);
      for (let i = 0; i < kindsBuffer.length; i++) {
        const kind = kindsBuffer[i];
        const config = EDGE_CONFIG_MAP.get(kind);
        const [r, g, b] = config?.colorRGB ?? [0.5, 0.5, 0.5];
        arr[i * 4] = r;
        arr[i * 4 + 1] = g;
        arr[i * 4 + 2] = b;
        arr[i * 4 + 3] = selectedId ? 0.3 : 1.0; // Default muted if selection active, else full
      }
      graph.setLinkColors(arr);

      // Set positions: hide types with no visible links if needed
      const currentPositions = graph.getPointPositions();
      const currentCount = typeGraph.nodes;

      if (!showFree) {
        // Hide nodes without links in current filter
        // Always capture latest positions before hiding, so we can restore accurately
        originalPositionsRef.current = Float32Array.from(currentPositions);
        const positions = new Float32Array(currentCount * 2);
        const hidden = new Set<number>();
        for (let i = 0; i < currentCount; i++) {
          if (!visibleTypeIds || !visibleTypeIds.has(i)) {
            positions[i * 2] = 1e6;
            positions[i * 2 + 1] = 1e6;
            hidden.add(i);
          } else {
            positions[i * 2] = currentPositions[i * 2];
            positions[i * 2 + 1] = currentPositions[i * 2 + 1];
          }
        }
        graph.setPointPositions(positions);
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

        // Only set colors if no selection active; applySelectionVisuals will set them if needed
        if (!selectedId) {
          graph.setPointColors(pointColors);
        }
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
          graph.setPointPositions(positions);
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
        // Only set colors if no selection active; applySelectionVisuals will set them if needed
        if (!selectedId) {
          graph.setPointColors?.(pointColors);
        }
      }

      const visibleNodeCount = showFree
        ? typeGraph.nodes
        : (visibleTypeIds?.size ?? 0);
      setVisibleStats({
        nodes: visibleNodeCount,
        links: filteredLinks.length,
      });

      // Re-apply selection visuals if a node is selected (this handles both point and link colors)
      if (selectedId) {
        const idx = idToIndexRef.current.get(selectedId);
        if (idx !== undefined) {
          applySelectionVisuals(idx);
        }
      } else {
        // Only render if no selection is active; applySelectionVisuals will render if active
        graph.render();
      }

      // no-op for removed debug view info
    },
    [
      allLinksRef.current,
      graphRef.current,
      kindsBufferRef,
      showFreeTypes,
      setVisibleStats,
      selectedId,
      hiddenIndicesRef,
      linkPairsRef,
      applySelectionVisuals,
      typeGraph,
    ],
  );

  const toggleShowFreeTypes = useCallback(() => {
    const nextShowFree = !showFreeTypes;
    setShowFreeTypes(nextShowFree);
    applyFilters(activeFilters, nextShowFree);
  }, [showFreeTypes, activeFilters, applyFilters, setShowFreeTypes]);

  return (
    <>
      <Box sx={{ py: 2, px: 4 }}>
        <Stack direction="row" spacing={2} alignItems="flex-end">
          <TextField
            placeholder="search by type id"
            size="small"
            value={selectedTypeId || ""}
            type="number"
            onChange={event => {
              const value = event.target.value;
              if (!value) {
                navigate({ to: "/type-graph" });
              } else {
                navigate({ to: `/type-graph/${value}` });
              }
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search
                      fontSize="small"
                      sx={{ opacity: selectedTypeId ? 1 : 0.5 }}
                    />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={e => setFilterAnchor(e.currentTarget)}
          >
            Filter Relations
          </Button>
          <IconButton
            onClick={() => {
              setSimulationPaused(!pausedRef.current);
            }}
            title={paused ? "Resume" : "Pause"}
          >
            {paused ? <PlayArrow /> : <Pause />}
          </IconButton>
          <IconButton
            onClick={toggleShowFreeTypes}
            title={
              showFreeTypes
                ? "only show types with relations"
                : "show all types (including those without relations)"
            }
          >
            <Share sx={{ transform: "rotate(180deg)" }} />
          </IconButton>
          <IconButton
            onClick={() => {
              const graph = graphRef.current;
              if (graph) {
                graph.fitView();
              }
            }}
            title="Fit All Nodes View"
          >
            <ZoomOutMap />
          </IconButton>
          <IconButton
            onClick={focusNode}
            title="Focus Selected Type"
            disabled={selectedIndex === null}
          >
            <FilterCenterFocus />
          </IconButton>

          <span style={{ flex: 1 }} />

          {(() => {
            const statsToRender = visibleStats;
            if (!statsToRender) {
              return null;
            }
            return (
              <Stack
                sx={{
                  flexDirection: "row",
                  gap: 1,
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <StatPill label="types" value={statsToRender.nodes} />
                <StatPill label="relations" value={statsToRender.links} />
              </Stack>
            );
          })()}
        </Stack>
      </Box>
      <TypeGraphPopover
        activeFilters={activeFilters}
        applyFilters={applyFilters}
        filterAnchor={filterAnchor}
        setFilterAnchor={setFilterAnchor}
        showFreeTypes={showFreeTypes}
        setActiveFilters={setActiveFilters}
      />
    </>
  );
};

const TypeGraphPopover = ({
  activeFilters,
  applyFilters,
  filterAnchor,
  setFilterAnchor,
  showFreeTypes,
  setActiveFilters,
}: {
  activeFilters: Set<LinkKind>;
  applyFilters: (
    filters: Set<LinkKind>,
    showFreeTypesOverride?: boolean,
  ) => void;
  filterAnchor: HTMLElement | null;
  setFilterAnchor: (anchor: HTMLElement | null) => void;
  showFreeTypes: boolean;
  setActiveFilters: (filters: Set<LinkKind>) => void;
}) => {
  const { data: stats } = useTypeGraphStats();

  return (
    <Popover
      open={Boolean(filterAnchor)}
      anchorEl={filterAnchor}
      onClose={() => setFilterAnchor(null)}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      disableScrollLock
      slotProps={{
        paper: {
          onMouseLeave: () => setFilterAnchor(null),
          sx: {
            background: "#00000050",
          },
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
        <Stack sx={{ px: 2, py: 1, overflowY: "auto", gap: 0 }}>
          {EDGE_CONFIGS.map(
            config => [config, stats?.count[config.id] ?? 0] as const,
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
                        onChange={e => {
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
                      <Stack direction="row" spacing={1} alignItems="center">
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
        <Box
          sx={{
            position: "sticky",
            bottom: 0,
            left: 0,
            right: 0,
            borderTop: 1,
            borderColor: "divider",
            p: 2,
            zIndex: 1,
            display: "flex",
            gap: 3,
            justifyContent: "center",
          }}
        >
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              const all = new Set(EDGE_CONFIGS.map(c => c.id));
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
              const none = new Set<LinkKind>();
              setActiveFilters(none);
              applyFilters(none, showFreeTypes);
            }}
          >
            NONE
          </Button>
        </Box>
      </Box>
    </Popover>
  );
};
