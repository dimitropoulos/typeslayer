import {
	Divider,
	List,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	ListSubheader,
	Stack,
} from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { type AwardId, awards } from "./awards";

const RenderAwardNav = ({
	activeAward,
	setActiveAward,
	awardId,
}: {
	activeAward: AwardId | null;
	setActiveAward: (award: AwardId) => void;
	awardId: AwardId;
}) => {
	const { title, icon: Icon, route } = awards[awardId];
	const navigate = useNavigate();
	const onClick = useCallback(() => {
		setActiveAward(awardId);
		navigate({ to: `/award-winners/${route}` });
	}, [awardId, setActiveAward, route, navigate]);
	const selected = activeAward === awardId;
	return (
		<ListItemButton key={awardId} selected={selected} onClick={onClick}>
			<ListItemIcon sx={{ minWidth: 38 }}>
				<Icon />
			</ListItemIcon>
			<ListItemText primary={title} />
		</ListItemButton>
	);
};

export const AwardNavigation = ({
	activeAward,
	setActiveAward,
}: {
	activeAward: AwardId;
	setActiveAward: (award: AwardId) => void;
}) => {
	return (
		<Stack
			sx={{
				px: 1,
				height: "100%",
				flexShrink: 0,
				maxWidth: 380,
				overflowY: "auto",
				backgroundImage:
					"radial-gradient(circle at 85% 70%, rgba(159,30,30,0.1), transparent 50%)," +
					"radial-gradient(circle at 30% 20%, rgba(227,179,65,0.025), transparent 60%)",
			}}
		>
			<List>
				<ListSubheader>Type-level Metrics</ListSubheader>

				{(
					[
						"unionTypes",
						"intersectionTypes",
						"typeArguments",
						"mostInstantiatedType",
						"aliasTypeArguments",
					] as const
				).map((awardId) => (
					<RenderAwardNav
						key={awardId}
						activeAward={activeAward}
						setActiveAward={setActiveAward}
						awardId={awardId}
					/>
				))}

				<Divider />

				<ListSubheader>Performance Metrics</ListSubheader>

				<RenderAwardNav
					activeAward={activeAward}
					setActiveAward={setActiveAward}
					awardId="hotSpots"
				/>

				<Divider />

				<ListSubheader>Type-Level Limits</ListSubheader>

				{(
					[
						"limit_instantiateType",
						"limit_recursiveTypeRelatedTo",
						"limit_typeRelatedToDiscriminatedType",
						"limit_checkCrossProductUnion",
						"limit_checkTypeRelatedTo",
						"limit_getTypeAtFlowNode",
						"limit_removeSubtypes",
						"limit_traceUnionsOrIntersectionsTooLarge",
					] as const
				).map((awardId) => (
					<RenderAwardNav
						key={awardId}
						activeAward={activeAward}
						setActiveAward={setActiveAward}
						awardId={awardId}
					/>
				))}

				<Divider />

				<ListSubheader>Bundle Implications</ListSubheader>

				<RenderAwardNav
					activeAward={activeAward}
					setActiveAward={setActiveAward}
					awardId={"duplicatePackages"}
				/>
			</List>
		</Stack>
	);
};
