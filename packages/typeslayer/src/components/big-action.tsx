import { LockReset } from "@mui/icons-material";
import { Box, Chip, Stack, useTheme } from "@mui/material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { NAVIGATION, type NavigationItem } from "./utils";

type ItemsWithTitle<
	T extends readonly NavigationItem[],
	Acc extends string[] = [],
> = T extends readonly [
	infer Item extends NavigationItem,
	...infer Rest extends NavigationItem[],
]
	? Item extends { title: string }
		? ItemsWithTitle<Rest, [...Acc, Item["title"]]>
		: ItemsWithTitle<Rest, Acc>
	: Acc[number][];

type Unlocks = ItemsWithTitle<typeof NAVIGATION>;

export function BigAction({
	title,
	description,
	unlocks,
	isLoading,
}: {
	title: string;
	description: string;
	unlocks: Unlocks;
	isLoading: boolean;
}) {
	const theme = useTheme();
	return (
		<Card
			sx={{
				maxWidth: 500,
				transition: "all 0.3s ease-in-out",
				border: `1px solid ${theme.palette.divider}`,
				...(isLoading && {
					outline: "3px solid",
					outlineColor: "primary.main",
					boxShadow: `0 0 20px ${theme.palette.secondary.main}80`,
					animation: "pulse 2s ease-in-out infinite",
					"@keyframes pulse": {
						"0%, 100%": {
							boxShadow: `0 0 20px ${theme.palette.secondary.main}80`,
						},
						"50%": {
							boxShadow: `0 0 30px ${theme.palette.secondary.main}80`,
						},
					},
				}),
			}}
		>
			<CardContent sx={{ flex: "1 0 auto" }}>
				<Stack direction="column" gap={2}>
					<Stack gap={1}>
						<Typography component="div" variant="h5">
							{title}
						</Typography>
						<Typography
							variant="subtitle1"
							component="div"
							sx={{ color: "text.secondary" }}
						>
							{description}
						</Typography>
					</Stack>

					<Stack
						sx={{
							direction: "column",
							gap: 1,
						}}
					>
						<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<LockReset />

							<Typography>
								{unlocks.length} Unlock{unlocks.length === 1 ? "" : "s"}
							</Typography>
						</Box>

						<Stack sx={{ display: "flex", flexDirection: "row", gap: 1 }}>
							{unlocks.map((unlock) => {
								const foundIcon = NAVIGATION.find(
									(item) => "title" in item && item.title === unlock,
								);
								const hasIcon =
									foundIcon && "icon" in foundIcon
										? { icon: foundIcon.icon }
										: {};
								return (
									<Chip key={unlock} {...hasIcon} label={unlock} size="small" />
								);
							})}
						</Stack>
					</Stack>
				</Stack>
			</CardContent>
		</Card>
	);
}
