import { FindInPage } from "@mui/icons-material";
import {
	IconButton,
	List,
	ListItem,
	ListItemText,
	Stack,
	Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";
import { useCallback, useEffect, useState } from "react";
import { Callout } from "../../components/callout";
import { friendlyPackageName } from "../../components/utils";
import { useProjectRoot, useSimplifyPaths } from "../../hooks/tauri-hooks";
import { awards } from "./awards";
import { InlineBarGraph } from "./inline-bar-graph";
import { TitleSubtitle } from "./title-subtitle";

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

	if (
		simplifyPaths.isLoading ||
		projectRoot.isLoading ||
		simplifyPaths.data === undefined ||
		projectRoot.data === undefined
	) {
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
									{friendlyPackageName(
										path ?? "",
										projectRootValue,
										simplifyPathsValue,
									)}
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
