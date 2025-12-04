import {
	Air,
	AltRoute,
	Calculate,
	Check,
	Close,
	CopyAll,
	Diversity1,
	Expand,
	Extension,
	FilterListAlt,
	FindReplace,
	GroupAdd,
	JoinFull,
	JoinInner,
	Key,
	Lightbulb,
	Polyline,
	QuestionMark,
	RotateRight,
	SafetyDivider,
	Search,
	SettingsBackupRestore,
	SportsKabaddi,
	SubdirectoryArrowRight,
	TrackChanges,
	Whatshot,
} from "@mui/icons-material";
import { Typography } from "@mui/material";
import { useFriendlyPackageName } from "../../hooks/tauri-hooks";

export const AWARD_SELECTOR_COLUMN_WIDTH = 500;

export type AwardId = keyof typeof awards;

export const awards = {
	//
	// TYPE METRICS
	//

	type_unionTypes: {
		title: "Largest Union",
		property: "unionTypes",
		description:
			"Type whose union has the greatest number of distinct members (breadth of possible shapes).",
		icon: JoinFull,
		unit: "union members",
		route: "largest-union",
	},
	type_intersectionTypes: {
		title: "Largest Intersection",
		property: "intersectionTypes",
		description:
			"Type whose intersection combines the greatest number of constituent types (breadth of constraints).",
		icon: JoinInner,
		unit: "intersections",
		route: "largest-intersection",
	},
	type_typeArguments: {
		title: "Most Type Arguments",
		property: "typeArguments",
		description:
			"Generic type with the largest number of supplied type arguments at its most complex instantiation.",
		icon: SportsKabaddi,
		unit: "type arguments",
		route: "most-type-arguments",
	},
	type_aliasTypeArguments: {
		title: "Alias Type Arguments",
		property: "aliasTypeArguments",
		description:
			"Type alias pulling in the greatest number of distinct generic arguments through its resolution layers.",
		icon: GroupAdd,
		unit: "aliased type arguments",
		route: "alias-type-arguments",
	},

	//
	// TYPE RELATION METRICS
	// (ordered by EDGE_RANKING)
	//

	relation_union: {
		title: "Union Member",
		description: "The type most frequently referenced in unions.",
		unit: "unions",
		icon: JoinFull,
		route: "union",
	},
	relation_intersection: {
		title: "Intersection Member",
		description: "The type most frequently referenced in intersections.",
		unit: "intersections",
		icon: JoinInner,
		route: "intersection",
	},
	relation_typeArgument: {
		title: "Type Argument",
		description:
			"The type most frequently used as a type argument (indicating complex generic interactions).",
		icon: SportsKabaddi,
		unit: "type arguments",
		route: "type-argument-relations",
	},
	relation_instantiated: {
		title: "Instantiated By",
		description: "Type that was instantiated the most, indicating high reuse.",
		icon: Polyline,
		unit: "instantiations",
		route: "most-instantiated-type",
	},
	relation_aliasTypeArgument: {
		title: "Alias Type Arguments",
		description:
			"Type involved in the greatest number of alias type-argument relations, useful for understanding alias generic complexity.",
		unit: "alias type-arguments",
		icon: GroupAdd,
		route: "aliasTypeArgument",
	},
	relation_conditionalCheck: {
		title: "Conditional Check Condition",
		description:
			"Type most often used as the checked type in conditional types (the `T` in `T extends U ? A : B`).",
		unit: "conditional checks",
		icon: QuestionMark,
		route: "conditionalCheck",
	},
	relation_conditionalExtends: {
		title: "Conditional Extends",
		description:
			"Type most frequently appearing on the `extends` side of conditional types (the `U` in `T extends U ? A : B`)), indicating common constraint relationships.",
		unit: "extends uses",
		icon: Extension,
		route: "conditionalExtends",
	},
	relation_conditionalFalse: {
		title: "Conditional False Branch",
		description:
			"Type that most often appears as the `false` branch result of conditional types. Indicates fallback/resolution patterns.",
		unit: "false-branch uses",
		icon: Close,
		route: "conditionalFalse",
	},
	relation_conditionalTrue: {
		title: "Conditional True Branch",
		description:
			"Type that most often appears as the `true` branch result of conditional types. Indicates favored resolution outcomes.",
		unit: "true-branch uses",
		icon: Check,
		route: "conditionalTrue",
	},
	relation_indexedAccessObject: {
		title: "Object Indexed Access By",
		description:
			"Type most frequently used as the object operand in indexed access (e.g. `T[K]`), indicating dynamic property shape usage.",
		unit: "indexed-accesses",
		icon: Search,
		route: "indexedAccessObject",
	},
	relation_indexedAccessIndex: {
		title: "Tuple Indexed Access By",
		description:
			"Type most frequently used as the index operand in indexed access of a tuple (e.g. `SomeTuple[K]`).",
		unit: "indexed-accesses",
		icon: Search,
		route: "indexedAccessIndex",
	},
	relation_keyof: {
		title: "Keyof Uses",
		description:
			"Type most frequently used within 'keyof' operations, often indicating dynamic property access patterns.",
		icon: Key,
		unit: "keyof uses",
		route: "keyof",
	},
	relation_reverseMappedSource: {
		title: "Reverse-Map Source",
		description:
			"Type most commonly appearing as the source in reverse-mapped type transforms (utility mapped types in reverse).",
		unit: "reverse-mappings",
		icon: SettingsBackupRestore,
		route: "reverseMappedSource",
	},
	relation_reverseMappedMapped: {
		title: "Reverse-Map Mapped By",
		description:
			"Type most commonly produced by reverse-mapped transformations.",
		unit: "reverse-mapped sources",
		icon: SettingsBackupRestore,
		route: "reverseMappedMapped",
	},
	relation_reverseMappedConstraint: {
		title: "Reverse-Map Constraints",
		description:
			"Type that often serves as a constraint in reverse-mapped transformations, indicating mapped type bounds.",
		unit: "reverse-mapping constraints",
		icon: SettingsBackupRestore,
		route: "reverseMappedConstraint",
	},
	relation_substitutionBase: {
		title: "Substitution Bases",
		description:
			"Type used as a substitution base during type substitution operations, signaling types that commonly serve as generic inference placeholders.",
		unit: "substitution uses",
		icon: FindReplace,
		route: "substitutionBase",
	},
	relation_constraint: {
		title: "Generic Constraints",
		description:
			"Type most often appearing as a generic constraint (e.g. in `extends` clauses) when resolving generics and conditionals.",
		unit: "constraint uses",
		icon: FilterListAlt,
		route: "constraint",
	},
	relation_evolvingArrayElement: {
		title: "Evolving Array Element",
		description:
			"Type most commonly used as the evolving array element during array widening/folding operations in inference.",
		unit: "array element uses",
		icon: TrackChanges,
		route: "evolvingArrayElement",
	},
	relation_evolvingArrayFinal: {
		title: "Evolving Array Final",
		description:
			"Type that frequently becomes the final element type after array evolution/widening, useful to spot common widened shapes.",
		unit: "array final uses",
		icon: TrackChanges,
		route: "evolvingArrayFinal",
	},
	relation_alias: {
		title: "Aliased As",
		description:
			"Type most frequently referenced as an alias target, shows which aliases are heavily reused across the codebase.",
		unit: "alias uses",
		icon: AltRoute,
		route: "alias",
	},

	//
	// PERFORMANCE METRICS
	//

	perf_hotSpots: {
		title: "Hot Spots",
		description:
			"Files or paths where the TypeScript compiler spent the most cumulative time. Use these to target expensive type-checking work for refactors.",
		icon: Whatshot,
		route: "hot-spots",
	},

	//
	// TYPE-LEVEL LIMITS
	//

	limit_instantiateType: {
		title: "Type Instantiation",
		property: "limit_instantiateType",
		description:
			"Types that hit the compiler's generic instantiation depth/count limit, often deeply nested conditional/infer chains.",
		icon: Lightbulb,
		route: "type-instantiation-limit",
	},
	limit_recursiveTypeRelatedTo: {
		title: "Recursive Relations",
		property: "limit_recursiveTypeRelatedTo",
		description:
			"Types that exhausted the recursive relation depth limit, heavy mutually-recursive or self-referential definitions.",
		icon: Diversity1,
		route: "recursive-relations-limit",
	},
	limit_typeRelatedToDiscriminatedType: {
		title: "Discrimination",
		property: "limit_typeRelatedToDiscriminatedType",
		description:
			"Types that hit the discriminated union combination exploration cap, extreme union + property pattern explosion.",
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

	//
	// BUNDLE IMPLICATIONS
	//

	bundle_duplicatePackages: {
		title: "Duplicate Packages",
		description:
			"Packages that appear multiple times in the bundle (different install paths / versions). Consolidate to reduce size & divergence.",
		icon: CopyAll,
		route: "duplicate-packages",
	},
} as const;

export const MaybePathCaption = ({
	maybePath,
}: {
	maybePath: string | null | undefined;
}) => {
	const friendlyPackageName = useFriendlyPackageName();

	if (!maybePath) {
		return null;
	}

	return (
		<Typography
			variant="caption"
			sx={{ color: "text.secondary", wordBreak: "break-all" }}
		>
			{friendlyPackageName(maybePath)}
		</Typography>
	);
};
