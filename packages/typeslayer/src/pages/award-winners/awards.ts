import {
	Air,
	Calculate,
	CopyAll,
	Diversity1,
	Expand,
	GroupAdd,
	JoinFull,
	JoinInner,
	Lightbulb,
	Polyline,
	RotateRight,
	SafetyDivider,
	SportsKabaddi,
	SubdirectoryArrowRight,
	Whatshot,
} from "@mui/icons-material";

export type AwardId = keyof typeof awards;

export const awards = {
	hotSpots: {
		title: "Hot Spots",
		description:
			"Files or paths where the TypeScript compiler spent the most cumulative time. Use these to target expensive type-checking work for refactors.",
		icon: Whatshot,
		route: "hot-spots",
	},
	unionTypes: {
		title: "Largest Union",
		property: "unionTypes",
		description:
			"Type whose union has the greatest number of distinct members (breadth of possible shapes).",
		icon: JoinFull,
		unit: "union members",
		route: "largest-union",
	},
	duplicatePackages: {
		title: "Duplicate Packages",
		description:
			"Packages that appear multiple times in the bundle (different install paths / versions). Consolidate to reduce size & divergence.",
		icon: CopyAll,
		route: "duplicate-packages",
	},
	typeArguments: {
		title: "Most Type Arguments",
		property: "typeArguments",
		description:
			"Generic type with the largest number of supplied type arguments at its most complex instantiation.",
		icon: SportsKabaddi,
		unit: "type arguments",
		route: "most-type-arguments",
	},
	mostInstantiatedType: {
		title: "Most Instantiated Type",
		description:
			"Type that was instantiated (resolved/expanded) the greatest number of times during the trace—high reuse or complexity hotspot.",
		icon: Polyline,
		unit: "instantiations",
		route: "most-instantiated-type",
	},
	intersectionTypes: {
		title: "Largest Intersection",
		property: "intersectionTypes",
		description:
			"Type whose intersection combines the greatest number of constituent types (breadth of constraints).",
		icon: JoinInner,
		unit: "intersections",
		route: "largest-intersection",
	},
	aliasTypeArguments: {
		title: "Alias Type Arguments",
		property: "aliasTypeArguments",
		description:
			"Type alias pulling in the greatest number of distinct generic arguments through its resolution layers.",
		icon: GroupAdd,
		unit: "aliased type arguments",
		route: "alias-type-arguments",
	},
	limit_instantiateType: {
		title: "Type Instantiation",
		property: "limit_instantiateType",
		description:
			"Types that hit the compiler's generic instantiation depth/count limit—often deeply nested conditional/infer chains.",
		icon: Lightbulb,
		route: "type-instantiation-limit",
	},
	limit_recursiveTypeRelatedTo: {
		title: "Recursive Relations",
		property: "limit_recursiveTypeRelatedTo",
		description:
			"Types that exhausted the recursive relation depth limit—heavy mutually-recursive or self-referential definitions.",
		icon: Diversity1,
		route: "recursive-relations-limit",
	},
	limit_typeRelatedToDiscriminatedType: {
		title: "Discrimination",
		property: "limit_typeRelatedToDiscriminatedType",
		description:
			"Types that hit the discriminated union combination exploration cap—extreme union + property pattern explosion.",
		icon: SafetyDivider,
		route: "discrimination-limit",
	},
	limit_checkCrossProductUnion: {
		title: "Cross-Product Union",
		property: "limit_checkCrossProductUnion",
		description:
			"Types limited due to cross-product union explosion (too many combinations).",
		icon: Calculate,
		route: "cross-product-union-limit",
	},
	limit_checkTypeRelatedTo: {
		title: "Type Relation Depth",
		property: "limit_checkTypeRelatedTo",
		description:
			"Relations that exceeded allowed depth while comparing complex types.",
		icon: RotateRight,
		route: "type-related-to-limit",
	},
	limit_getTypeAtFlowNode: {
		title: "Flow Node Type",
		property: "limit_getTypeAtFlowNode",
		description:
			"Flow analysis type queries that hit internal iteration limits.",
		icon: Air,
		route: "flow-node-type-limit",
	},
	limit_removeSubtypes: {
		title: "Remove Subtypes",
		property: "limit_removeSubtypes",
		description:
			"Subtype removal encountered limits when pruning complex unions/intersections.",
		icon: SubdirectoryArrowRight,
		route: "remove-subtypes-limit",
	},
	limit_traceUnionsOrIntersectionsTooLarge: {
		title: "Union/Intersection Size",
		property: "limit_traceUnionsOrIntersectionsTooLarge",
		description:
			"Unions or intersections were too large to fully analyze without exceeding limits.",
		icon: Expand,
		route: "union-intersection-size-limit",
	},
} as const;
