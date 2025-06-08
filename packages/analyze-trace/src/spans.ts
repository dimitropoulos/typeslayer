import {
	eventPhase,
	type TraceEvent,
	type TraceJsonSchema,
} from "@typeslayer/validate";
import type {
	AnalyzeTraceOptions,
	EventSpan,
	Microseconds,
	ParseResult,
} from "./utils";

/*
 * This function takes an array of trace events and converts them into spans.
 */
export function createSpans(traceFile: TraceJsonSchema): ParseResult {
	// Sorted in increasing order of start time (even when below timestamp resolution)
	const unclosedStack: TraceEvent[] = [];

	// Sorted in increasing order of end time, then increasing order of start time (even when below timestamp resolution)
	const spans: EventSpan[] = [];

	traceFile.forEach((event: TraceEvent) => {
		switch (event.ph) {
			case eventPhase.begin:
				unclosedStack.push(event);
				return;

			case eventPhase.end: {
				const beginEvent = unclosedStack.pop();
				if (!beginEvent) {
					throw new Error("Unmatched end event");
				}
				spans.push({
					event: beginEvent,
					start: beginEvent.ts,
					end: event.ts,
					duration: event.ts - beginEvent.ts,
					children: [],
				});
				break;
			}

			case eventPhase.complete: {
				const start = event.ts;
				const duration = event.dur;
				spans.push({
					event,
					start,
					end: start + duration,
					duration,
					children: [],
				});
				break;
			}

			case eventPhase.instantGlobal:
			case eventPhase.metadata:
				return;

			default:
				event satisfies never;
		}
	});

	const parseResult: ParseResult = {
		firstSpanStart: Math.min(...spans.map((span) => span.start)),
		lastSpanEnd: Math.max(...spans.map((span) => span.end)),
		spans,
		unclosedStack,
	};
	return parseResult;
}

export function createSpanTree(
	parseResult: ParseResult,
	options: AnalyzeTraceOptions,
): EventSpan {
	const { firstSpanStart, lastSpanEnd, spans, unclosedStack } = parseResult;

	// Add unclosed events to the spans
	for (let i = unclosedStack.length - 1; i >= 0; i--) {
		const event = unclosedStack[i];
		const start = event.ts;
		const end = lastSpanEnd;
		spans.push({
			event,
			start,
			end,
			duration: end - start,
			children: [],
		});
	}

	spans.sort((a, b) => a.start - b.start);

	const root: EventSpan = {
		event: {
			name: "root",
			cat: "program",
		},
		start: firstSpanStart,
		end: lastSpanEnd,
		duration: lastSpanEnd - firstSpanStart,
		children: [],
	};
	const stack = [root];

	for (const span of spans) {
		let i = stack.length - 1;
		for (; i > 0; i--) {
			// No need to check root at stack[0]
			const curr = stack[i];
			if (curr.end > span.start) {
				// Pop down to parent
				stack.length = i + 1;
				break;
			}
		}

		/** Microseconds */
		const thresholdDuration: Microseconds = options.forceMillis * 1000;
		const isAboveThresholdDuration = span.duration >= thresholdDuration;

		const parent = stack[i];
		const parentDuration = parent.end - parent.start;
		const isSignificantPortionOfParent =
			span.duration >= parentDuration * options.minSpanParentPercentage;

		if (isAboveThresholdDuration || isSignificantPortionOfParent) {
			parent.children.push(span);
			stack.push(span);
		}
	}

	return root;
}
