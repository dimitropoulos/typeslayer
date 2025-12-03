import { Box, Divider, Stack } from "@mui/material";
import { useParams } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import type {
	EventChecktypes__CheckCrossProductUnion_DepthLimit,
	EventChecktypes__CheckTypeRelatedTo_DepthLimit,
	EventChecktypes__GetTypeAtFlowNode_DepthLimit,
	EventChecktypes__InstantiateType_DepthLimit,
	EventChecktypes__RecursiveTypeRelatedTo_DepthLimit,
	EventChecktypes__RemoveSubtypes_DepthLimit,
	EventChecktypes__TraceUnionsOrIntersectionsTooLarge_DepthLimit,
	EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit,
	ResolvedType,
	TypeRegistry,
} from "@typeslayer/validate";
import { useCallback, useEffect, useState } from "react";
import { ArrayAward } from "./array-award";
import { AwardNavigation } from "./award-navigation";
import { type AwardId, awards } from "./awards";
import { DuplicatePackages } from "./bundle-implications";
import { GraphAward } from "./graph-award";
import { ShowHotSpots } from "./hot-spots";
import { InlineBarGraph } from "./inline-bar-graph";
import { ShowTypeLimit } from "./show-type-limit";

export const RenderPlayground = ({
	activeAward,
	typeRegistry,
}: {
	activeAward: AwardId;
	typeRegistry: TypeRegistry;
}) => {
	switch (activeAward) {
		case "typeArguments":
			return (
				<ArrayAward
					key={activeAward}
					typeRegistry={typeRegistry}
					{...awards.typeArguments}
				/>
			);
		case "mostInstantiatedType":
			return (
				<GraphAward
					key={activeAward}
					typeRegistry={typeRegistry}
					{...awards.mostInstantiatedType}
				/>
			);
		case "unionTypes":
			return (
				<ArrayAward
					key={activeAward}
					typeRegistry={typeRegistry}
					{...awards.unionTypes}
				/>
			);
		case "intersectionTypes":
			return (
				<ArrayAward
					key={activeAward}
					typeRegistry={typeRegistry}
					{...awards.intersectionTypes}
				/>
			);
		case "aliasTypeArguments":
			return (
				<ArrayAward
					key={activeAward}
					typeRegistry={typeRegistry}
					{...awards.aliasTypeArguments}
				/>
			);
		case "duplicatePackages":
			return <DuplicatePackages />;

		case "hotSpots":
			return <ShowHotSpots />;

		case "limit_instantiateType":
			return (
				<ShowTypeLimit<EventChecktypes__InstantiateType_DepthLimit>
					depthLimitKey="instantiateType_DepthLimit"
					key={awards.limit_instantiateType.title}
					notFound={{
						title: "No Type Instantiation Limits Found",
						description: "No type instantiation limits detected.",
					}}
					title={awards.limit_instantiateType.title}
					subtitle={(first) =>
						`The most complex types that were limited by the type system.\nThe current limit is set to ${first.args.instantiationCount.toLocaleString()}, and every type shown below hit that limit.`
					}
					typeRegistry={typeRegistry}
					icon={awards.limit_instantiateType.icon}
					inlineBarGraph={(current, first) => (
						<InlineBarGraph
							label={`${current.args.instantiationDepth.toLocaleString()} depth`}
							width={`${
								(current.args.instantiationDepth /
									first.args.instantiationDepth) *
								100
							}%`}
						/>
					)}
					getKey={(current) =>
						`${current.args.typeId}-${current.args.instantiationCount}-${current.args.instantiationDepth}:${current.ts}`
					}
					getTypeId={(current) => current.args.typeId}
				/>
			);

		case "limit_recursiveTypeRelatedTo":
			return (
				<ShowTypeLimit<EventChecktypes__RecursiveTypeRelatedTo_DepthLimit>
					key={awards.limit_recursiveTypeRelatedTo.title}
					depthLimitKey="recursiveTypeRelatedTo_DepthLimit"
					notFound={{
						title: "No Recursive Relations Limits Found",
						description: "No recursive relations limits detected.",
					}}
					title={awards.limit_recursiveTypeRelatedTo.title}
					subtitle={(first) =>
						`The most complex types that were limited by the type system.\nThe current limit is set to ${first.args.targetDepth.toLocaleString()}, and every type shown below hit that limit.`
					}
					typeRegistry={typeRegistry}
					icon={awards.limit_recursiveTypeRelatedTo.icon}
					inlineBarGraph={(current, first) => (
						<InlineBarGraph
							label={`${current.args.depth.toLocaleString()} depth`}
							width={`${(current.args.depth / first.args.depth) * 100}%`}
						/>
					)}
					getKey={(current) =>
						`${current.args.sourceId}-${current.args.sourceId}:${current.ts}`
					}
					getTypeId={(current) => current.args.sourceId}
				/>
			);

		case "limit_typeRelatedToDiscriminatedType":
			return (
				<ShowTypeLimit<EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit>
					key={awards.limit_typeRelatedToDiscriminatedType.title}
					depthLimitKey="typeRelatedToDiscriminatedType_DepthLimit"
					notFound={{
						title: "No Discriminated Type Limits Found",
						description: "No discriminated type limits detected.",
					}}
					title={awards.limit_typeRelatedToDiscriminatedType.title}
					subtitle={(first) =>
						`The most complex types that were limited by the type system.\nThe current limit is set to ${first.args.numCombinations.toLocaleString()}, and every type shown below hit that limit.`
					}
					typeRegistry={typeRegistry}
					icon={awards.limit_typeRelatedToDiscriminatedType.icon}
					inlineBarGraph={(current, first) => (
						<InlineBarGraph
							label={`${current.args.numCombinations.toLocaleString()} depth`}
							width={`${
								(current.args.numCombinations / first.args.numCombinations) *
								100
							}%`}
						/>
					)}
					getKey={(current) =>
						`${current.args.sourceId}-${current.args.targetId}:${current.ts}`
					}
					getTypeId={(current) => current.args.sourceId}
				/>
			);

		case "limit_checkCrossProductUnion":
			return (
				<ShowTypeLimit<EventChecktypes__CheckCrossProductUnion_DepthLimit>
					key={awards.limit_checkCrossProductUnion.title}
					depthLimitKey="checkCrossProductUnion_DepthLimit"
					notFound={{
						title: "No Cross-Product Union Limits Found",
						description: "No cross-product union limits detected.",
					}}
					title={awards.limit_checkCrossProductUnion.title}
					subtitle={(first) =>
						`Union cross-product limited. Current size: ${first.args.size.toLocaleString()}.`
					}
					typeRegistry={typeRegistry}
					icon={awards.limit_checkCrossProductUnion.icon}
					inlineBarGraph={(current, first) => (
						<InlineBarGraph
							label={`${current.args.size.toLocaleString()} size`}
							width={`${(current.args.size / first.args.size) * 100}%`}
						/>
					)}
					getKey={(current) => `${current.args.types.join("-")}:${current.ts}`}
					getTypeId={(current) => current.args.types[0] ?? 0}
				/>
			);

		case "limit_checkTypeRelatedTo":
			return (
				<ShowTypeLimit<EventChecktypes__CheckTypeRelatedTo_DepthLimit>
					key={awards.limit_checkTypeRelatedTo.title}
					depthLimitKey="checkTypeRelatedTo_DepthLimit"
					notFound={{
						title: "No Type Relation Depth Limits Found",
						description: "No type relation depth limits detected.",
					}}
					title={awards.limit_checkTypeRelatedTo.title}
					subtitle={(first) =>
						`Relations limited by depth. Current depth limit: ${first.args.depth.toLocaleString()}.`
					}
					typeRegistry={typeRegistry}
					icon={awards.limit_checkTypeRelatedTo.icon}
					inlineBarGraph={(current, first) => (
						<InlineBarGraph
							label={`${current.args.depth.toLocaleString()} depth`}
							width={`${(current.args.depth / first.args.depth) * 100}%`}
						/>
					)}
					getKey={(current) =>
						`${current.args.sourceId}-${current.args.targetId}:${current.ts}`
					}
					getTypeId={(current) => current.args.sourceId}
				/>
			);

		case "limit_getTypeAtFlowNode":
			return (
				<ShowTypeLimit<EventChecktypes__GetTypeAtFlowNode_DepthLimit>
					key={awards.limit_getTypeAtFlowNode.title}
					depthLimitKey="getTypeAtFlowNode_DepthLimit"
					notFound={{
						title: "No Flow Node Type Limits Found",
						description: "No flow node type limits detected.",
					}}
					title={awards.limit_getTypeAtFlowNode.title}
					subtitle={(first) =>
						`Flow node queries limited. FlowId example: ${first.args.flowId.toLocaleString()}.`
					}
					typeRegistry={typeRegistry}
					icon={awards.limit_getTypeAtFlowNode.icon}
					inlineBarGraph={(current) => (
						<InlineBarGraph
							label={`${current.args.flowId.toLocaleString()} flowId`}
							width={`100%`}
						/>
					)}
					getKey={(current) => `${current.args.flowId}:${current.ts}`}
					getTypeId={(current) => current.args.flowId}
				/>
			);

		case "limit_removeSubtypes":
			return (
				<ShowTypeLimit<EventChecktypes__RemoveSubtypes_DepthLimit>
					key={awards.limit_removeSubtypes.title}
					depthLimitKey="removeSubtypes_DepthLimit"
					notFound={{
						title: "No Remove Subtypes Limits Found",
						description: "No remove subtypes limits detected.",
					}}
					title={awards.limit_removeSubtypes.title}
					subtitle={() =>
						`Subtype removal encountered limits in complex cases.`
					}
					typeRegistry={typeRegistry}
					icon={awards.limit_removeSubtypes.icon}
					inlineBarGraph={() => (
						<InlineBarGraph label={`limit hit`} width={`100%`} />
					)}
					getKey={(current) =>
						`${current.args.typeIds.join("-")}:${current.ts}`
					}
					getTypeId={(current) => current.args.typeIds[0] ?? 0}
				/>
			);

		case "limit_traceUnionsOrIntersectionsTooLarge":
			return (
				<ShowTypeLimit<EventChecktypes__TraceUnionsOrIntersectionsTooLarge_DepthLimit>
					key={awards.limit_traceUnionsOrIntersectionsTooLarge.title}
					depthLimitKey="traceUnionsOrIntersectionsTooLarge_DepthLimit"
					notFound={{
						title: "No Union/Intersection Size Limits Found",
						description: "No union/intersection size limits detected.",
					}}
					title={awards.limit_traceUnionsOrIntersectionsTooLarge.title}
					subtitle={(first) =>
						`Size product limited: ${(first.args.sourceSize * first.args.targetSize).toLocaleString()}.`
					}
					typeRegistry={typeRegistry}
					icon={awards.limit_traceUnionsOrIntersectionsTooLarge.icon}
					inlineBarGraph={(current, first) => (
						<InlineBarGraph
							label={`${(current.args.sourceSize * current.args.targetSize).toLocaleString()} size`}
							width={`${((current.args.sourceSize * current.args.targetSize) / (first.args.sourceSize * first.args.targetSize)) * 100}%`}
						/>
					)}
					getKey={(current) =>
						`${current.args.sourceId}-${current.args.targetId}:${current.ts}`
					}
					getTypeId={(current) => current.args.sourceId}
				/>
			);

		default:
			activeAward satisfies never;
			throw new Error(`Unknown award: ${activeAward}`);
	}
};

export const AwardWinners = () => {
	const params = useParams({ strict: false });
	const awardId = params.awardId as string | undefined;

	// Find the award key that matches the route
	const getAwardIdFromRoute = useCallback(
		(route: string | undefined): AwardId => {
			if (!route) return "unionTypes";
			const entry = Object.entries(awards).find(
				([_, award]) => award.route === route,
			);
			return entry ? (entry[0] as AwardId) : "unionTypes";
		},
		[],
	);

	const [activeAward, setActiveAward] = useState<AwardId>(
		getAwardIdFromRoute(awardId),
	);

	// Sync active award when URL changes
	useEffect(() => {
		const newAward = getAwardIdFromRoute(awardId);
		if (newAward !== activeAward) {
			setActiveAward(newAward);
		}
	}, [awardId, activeAward, getAwardIdFromRoute]);

	const [typeRegistry, setTypeRegistry] = useState<TypeRegistry>(new Map());
	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const types: ResolvedType[] = await invoke("get_types_json");
				const entries = types.map((t) => [t.id, t]) as [number, ResolvedType][];
				if (mounted) setTypeRegistry(new Map(entries));
				(window as unknown as { typeRegistry: TypeRegistry }).typeRegistry =
					new Map(entries);
			} catch (e) {
				console.error("Failed to load types registry", e);
			}
		})();
		return () => {
			mounted = false;
		};
	}, []);

	window.typeRegistry = typeRegistry;

	return (
		<Stack
			direction="row"
			sx={{
				minWidth: 500,
				minHeight: 500,
				alignItems: "flex-start",
				flexGrow: 1,
				height: "100%",
				display: "flex",
			}}
		>
			<AwardNavigation
				activeAward={activeAward}
				setActiveAward={setActiveAward}
			/>

			<Divider orientation="vertical" />

			<Box
				sx={{
					flexGrow: 1,
					maxWidth: "100%",
					height: "100%",
					overflow: "auto",
				}}
			>
				<RenderPlayground
					activeAward={activeAward}
					typeRegistry={typeRegistry}
				/>
			</Box>
		</Stack>
	);
};
