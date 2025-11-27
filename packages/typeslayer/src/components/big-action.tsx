import { LockReset } from "@mui/icons-material";
import { Button, CardActions, Chip, Stack } from "@mui/material";
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
	onDoIt,
	isLoading,
}: {
	title: string;
	description: string;
	unlocks: Unlocks;
	onDoIt: () => void;
	isLoading: boolean;
}) {
	return (
		<Card sx={{ maxWidth: 500 }}>
			<CardContent sx={{ flex: "1 0 auto" }}>
				<Stack direction="row">
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
						direction="column"
						sx={{ pl: 1 }}
						alignItems="center"
						spacing={1}
					>
						<LockReset />

						<Typography
							variant="subtitle1"
							color="text.secondary"
							align="center"
						>
							{unlocks.length} Unlock{unlocks.length === 1 ? "" : "s"}
						</Typography>

						<Stack
							direction="column"
							spacing={1}
							sx={{ display: "block" }}
						>
							{unlocks.map((unlock) => {
								const foundIcon = NAVIGATION.find(
									(item) => "title" in item && item.title === unlock,
								);
								const hasIcon =
									foundIcon && "icon" in foundIcon ? { icon: foundIcon.icon } : {};
								return (
									<Chip key={unlock} {...hasIcon} label={unlock} size="small" />
								);
							})}
						</Stack>
					</Stack>
				</Stack>
			</CardContent>

			<CardActions>
				<Button onClick={onDoIt} loading={isLoading} disabled={isLoading}>
					DO IT
				</Button>
			</CardActions>
		</Card>
	);
}
