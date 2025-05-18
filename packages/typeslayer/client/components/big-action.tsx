import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { Button, CardActions, Chip, Stack } from "@mui/material";
import { NAVIGATION } from "./utils";
import { LockReset } from "@mui/icons-material";
import type { NavigationItem } from "@toolpad/core";
import { theme } from "../theme";

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

export default function BigAction({
	title,
	description,
	unlocks,
	onDoIt,
}: {
	title: string;
	description: string;
	unlocks: ItemsWithTitle<typeof NAVIGATION>;
	onDoIt: () => void;
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

						<Stack direction="column" spacing={1} sx={{ mt: 1 }}>
							{unlocks.map((unlock) => {
								const icon = NAVIGATION.find(
									(item) => "title" in item && item.title === unlock,
								);
								const hasIcon =
									icon && "icon" in icon ? { icon: icon.icon } : {};
								return (
									<Chip key={unlock} {...hasIcon} label={unlock} size="small" />
								);
							})}
						</Stack>
					</Stack>
				</Stack>
			</CardContent>

			<CardActions>
				<Button onClick={onDoIt}>DO IT</Button>
			</CardActions>
		</Card>
	);
}
