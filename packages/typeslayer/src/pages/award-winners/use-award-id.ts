import { useNavigate, useParams } from "@tanstack/react-router";
import { useCallback } from "react";
import { type AwardId, awards } from "./awards";

// Find the award key that matches the route
const getAwardIdFromRoute = (route: string | undefined): AwardId => {
	if (!route) return "type_unionTypes";
	const entry = Object.entries(awards).find(
		([_, award]) => award.route === route,
	);
	return entry ? (entry[0] as AwardId) : "type_unionTypes";
};

export const useAwardId = () => {
	const params = useParams({ strict: false });
	const awardId = params.awardId as string | undefined;
	const navigate = useNavigate();

	const activeAward: AwardId = getAwardIdFromRoute(awardId);
	const setActiveAward = useCallback(
		(id: AwardId) => {
			const route = awards[id].route;
			navigate({ to: `/award-winners/${route}` });
		},
		[navigate],
	);
	return {
		activeAward,
		setActiveAward,
	};
};
