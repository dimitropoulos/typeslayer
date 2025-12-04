import { FindInPage } from "@mui/icons-material";
import {
	IconButton,
	List,
	ListItem,
	ListItemText,
	ListSubheader,
	Stack,
	Typography,
} from "@mui/material";
import { openPath } from "@tauri-apps/plugin-opener";
import { useCallback } from "react";
import { Callout } from "../../components/callout";
import {
	useAnalyzeTrace,
	useProjectRoot,
	useSimplifyPaths,
} from "../../hooks/tauri-hooks";
import { AwardNavItem } from "./award-nav-item";
import { type AwardId, awards, MaybePathCaption } from "./awards";
import { InlineBarGraph } from "./inline-bar-graph";
import { TitleSubtitle } from "./title-subtitle";

const ShowHotSpots = () => {
	const simplifyPaths = useSimplifyPaths();
	const projectRoot = useProjectRoot();
	const { data: analyzeTrace } = useAnalyzeTrace();

	const findInPage = useCallback(async (path: string | undefined) => {
		if (!path) return;
		try {
			await openPath(path);
		} catch (e) {
			console.error("Failed to open file", e);
		}
	}, []);

	if (
		simplifyPaths.isLoading ||
		projectRoot.isLoading ||
		simplifyPaths.data === undefined ||
		projectRoot.data === undefined
	) {
		return null;
	}

	const hotSpots = analyzeTrace?.hotSpots ?? [];

	const firstHotSpot = hotSpots[0];
	const Icon = awards.perf_hotSpots.icon;

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
							<Stack gap={0.5}>
								<MaybePathCaption maybePath={path} />
								<InlineBarGraph
									label={`${timeMs.toLocaleString()}ms`}
									width={`${relativeTime * 100}%`}
								/>
							</Stack>
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
		<Stack sx={{ m: 3, gap: 3 }}>
			<TitleSubtitle
				title="Hot Spots"
				subtitle="The most expensive code paths in your application"
				icon={<Icon fontSize="large" />}
			/>

			{firstHotSpot ? hasHotSpots : noneFound}
		</Stack>
	);
};

const performanceMetrics = ["perf_hotSpots"] satisfies AwardId[];
type PerformanceMetricsAwardId = (typeof performanceMetrics)[number];

const usePerformanceMetricsValue = () => {
	const { data: analyzeTrace } = useAnalyzeTrace();

	return useCallback(
		(awardId: PerformanceMetricsAwardId): number => {
			switch (awardId) {
				case "perf_hotSpots": {
					const hotSpots = analyzeTrace?.hotSpots ?? [];
					return hotSpots.length;
				}
				default:
					awardId satisfies never;
					throw new Error(`Unknown award: ${awardId}`);
			}
		},
		[analyzeTrace],
	);
};

export const PerformanceMetricsNavItems = () => {
	const getValue = usePerformanceMetricsValue();

	return (
		<>
			<ListSubheader>Performance Metrics</ListSubheader>

			{performanceMetrics.map((awardId) => (
				<AwardNavItem
					key={awardId}
					awardId={awardId}
					value={getValue(awardId)}
				/>
			))}
		</>
	);
};

export const PerformanceMetricsAward = ({
	awardId,
}: {
	awardId: PerformanceMetricsAwardId;
}) => {
	if (awardId !== "perf_hotSpots") {
		throw new Error(`Unknown award: ${awardId}`);
	}

	return <ShowHotSpots />;
};
