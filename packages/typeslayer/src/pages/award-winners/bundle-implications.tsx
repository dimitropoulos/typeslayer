import { List, ListItemButton, Stack, Typography } from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { awards } from "./awards";
import { TitleSubtitle } from "./title-subtitle";

export const DuplicatePackages = () => {
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

	const noneFound = <div>no duplicate packages found.</div>;

	return (
		<Stack sx={{ m: 3, gap: 2 }}>
			<TitleSubtitle
				title="Duplicate Packages"
				subtitle="Packages that are duplicated in the bundle.  TypeScript doesn't keep track of where these were included from, but at least now you know they're there."
				icon={<Icon fontSize="large" />}
			/>

			<Stack gap={3}>
				{duplicatePackages.length > 0
					? duplicatePackages.map(({ instances, name }) => (
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
						))
					: noneFound}
			</Stack>
		</Stack>
	);
};
