import { Chip, Stack, Typography } from "@mui/material";
import type { ResolvedType } from "@typeslayer/validate";

export function TypeSummary({
	onClick = () => {},
	showFlags = false,
	resolvedType,
}: {
	onClick?: () => void;
	showFlags?: boolean;
	resolvedType: ResolvedType;
}) {
	const { id, flags } = resolvedType;

	let humanReadable = "<anonymous>";
	if (
		"symbolName" in resolvedType &&
		typeof resolvedType.symbolName === "string"
	) {
		humanReadable = resolvedType.symbolName;
	} else if (
		"intrinsicName" in resolvedType &&
		typeof resolvedType.intrinsicName === "string"
	) {
		humanReadable = resolvedType.intrinsicName;
	} else if (
		flags.length === 1 &&
		(flags[0] === "StringLiteral" ||
			flags[0] === "NumberLiteral" ||
			flags[0] === "BooleanLiteral" ||
			flags[0] === "BigIntLiteral") &&
		typeof resolvedType.display === "string"
	) {
		humanReadable = resolvedType.display;
	}
	return (
		<Stack
			direction="row"
			gap={1}
			onClick={onClick}
			sx={{ cursor: "pointer", alignItems: "center" }}
		>
			<Typography color="secondary" sx={{ fontFamily: "monospace" }}>
				{humanReadable}
			</Typography>
			<Typography sx={{ fontFamily: "monospace" }}>id:{id}</Typography>
			{showFlags
				? flags.map((flag) => (
						<Chip
							variant="filled"
							key={flag}
							label={flag}
							size="small"
							sx={{ height: 20 }}
						/>
					))
				: null}
		</Stack>
	);
}
