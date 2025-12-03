import {
	Box,
	Divider,
	List,
	ListItemButton,
	ListItemText,
	Stack,
	Typography,
} from "@mui/material";
import type { DepthLimitsRecord } from "@typeslayer/analyze-trace";
import type {
	EventChecktypes__CheckCrossProductUnion_DepthLimit,
	EventChecktypes__CheckTypeRelatedTo_DepthLimit,
	EventChecktypes__GetTypeAtFlowNode_DepthLimit,
	EventChecktypes__InstantiateType_DepthLimit,
	EventChecktypes__RecursiveTypeRelatedTo_DepthLimit,
	EventChecktypes__RemoveSubtypes_DepthLimit,
	EventChecktypes__TraceUnionsOrIntersectionsTooLarge_DepthLimit,
	EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit,
	TypeRegistry,
} from "@typeslayer/validate";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { Callout } from "../../components/callout";
import { DisplayRecursiveType } from "../../components/display-recursive-type";
import { TypeSummary } from "../../components/type-summary";
import { extractPath, friendlyPackageName } from "../../components/utils";
import {
	useAnalyzeTrace,
	useProjectRoot,
	useSimplifyPaths,
} from "../../hooks/tauri-hooks";
import type { awards } from "./awards";
import { TitleSubtitle } from "./title-subtitle";

type LimitType =
	| EventChecktypes__InstantiateType_DepthLimit
	| EventChecktypes__RecursiveTypeRelatedTo_DepthLimit
	| EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit
	| EventChecktypes__CheckCrossProductUnion_DepthLimit
	| EventChecktypes__CheckTypeRelatedTo_DepthLimit
	| EventChecktypes__GetTypeAtFlowNode_DepthLimit
	| EventChecktypes__RemoveSubtypes_DepthLimit
	| EventChecktypes__TraceUnionsOrIntersectionsTooLarge_DepthLimit;

export const ShowTypeLimit = <L extends LimitType>({
	depthLimitKey,
	getKey,
	getTypeId,
	icon: Icon,
	inlineBarGraph,
	notFound,
	subtitle,
	title,
	typeRegistry,
}: {
	depthLimitKey: keyof DepthLimitsRecord;
	getKey: (current: L) => string;
	getTypeId: (current: L) => number;
	icon: (typeof awards)[keyof typeof awards]["icon"];
	inlineBarGraph: (current: L, first: L) => ReactNode;
	notFound: {
		title: string;
		description: string;
	};
	subtitle: (first: L) => string;
	title: string;
	typeRegistry: TypeRegistry;
}) => {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [selectedIndex, setSelectedIndex] = useState<number>(0);
	const simplifyPaths = useSimplifyPaths();
	const projectRoot = useProjectRoot();

	const { data: analyzeTrace } = useAnalyzeTrace();

	const handleTypeClick = useCallback((index: number) => {
		setSelectedIndex(index);
		if (scrollContainerRef.current) {
			scrollContainerRef.current.scrollTop = 0;
		}
	}, []);

	if (
		simplifyPaths.isLoading ||
		projectRoot.isLoading ||
		simplifyPaths.data === undefined ||
		projectRoot.data === undefined
	) {
		return null;
	}

	// Type narrowing: we know data exists after the check above
	const simplifyPathsValue: boolean = simplifyPaths.data;
	const projectRootValue: string = projectRoot.data;

	if (!analyzeTrace || !analyzeTrace.depthLimits[depthLimitKey]?.length) {
		return (
			<Callout title={notFound.title} sx={{ m: 3 }}>
				<Typography>{notFound.description}</Typography>
			</Callout>
		);
	}

	const data = analyzeTrace.depthLimits[depthLimitKey] as L[];
	const first = data[0];

	return (
		<Stack
			sx={{
				flexDirection: "row",
				alignItems: "flex-start",
				height: "100%",
			}}
		>
			<Stack
				sx={{
					minWidth: 500,
					maxWidth: 500,
					p: 3,
					overflowY: "auto",
					maxHeight: "100%",
				}}
			>
				<TitleSubtitle
					title={title}
					subtitle={subtitle(first)}
					icon={<Icon fontSize="large" />}
				/>

				<List>
					{data.map((current, index) => {
						const typeId = getTypeId(current);
						const resolvedType = typeRegistry.get(typeId);
						const key = getKey(current);

						if (!resolvedType) {
							return (
								<ListItemText key={key}>
									<Typography color="error">
										Type {typeId} not found in type registry
									</Typography>
								</ListItemText>
							);
						}

						const extractedPath = extractPath(resolvedType);
						return (
							<ListItemButton
								key={key}
								onClick={() => handleTypeClick(index)}
								selected={index === selectedIndex}
							>
								<ListItemText>
									<TypeSummary resolvedType={resolvedType} />
									{extractedPath ? (
										<Typography variant="caption" sx={{ mr: 2 }}>
											{friendlyPackageName(
												extractedPath,
												projectRootValue,
												simplifyPathsValue,
											)}
										</Typography>
									) : null}
									{inlineBarGraph(current, first)}
								</ListItemText>
							</ListItemButton>
						);
					})}
				</List>
			</Stack>

			<Divider orientation="vertical" />

			<Box
				sx={{
					p: 3,
					overflowY: "auto",
					maxHeight: "100%",
					width: "100%",
					height: "100%",
				}}
				ref={scrollContainerRef}
			>
				<DisplayRecursiveType
					id={getTypeId(data[selectedIndex])}
					typeRegistry={typeRegistry}
				/>
			</Box>
		</Stack>
	);
};
