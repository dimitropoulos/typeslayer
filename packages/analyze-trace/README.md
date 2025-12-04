# @typeslayer/analyze-trace

Analyze TypeScript compiler trace events to identify performance bottlenecks and compilation hot spots.

Initially, this started as a full rewrite of [@typescript/analyze-trace](https://github.com/microsoft/typescript-analyze-trace)*.  That rewrite was successful, new features were added during the development of [TypeSlayer](https://github.com/dimitropoulos/typeslayer).

<sub>
> \* why did it need a full rewrite?  it's been unmaintained for many years and also I ([dimitropoulos](https://github.com/dimitropoulos)) wanted to know every detail of how it works.  That ended up being very useful because there were some things that are exceedingly interesting (like some of the instantaneous events for limits being hit) that the original tool ([intentionally](https://github.com/microsoft/typescript-analyze-trace/issues/1), in some cases) completely ignores things that are actually quite fundamental to the goal of TypeSlayer
> also the original was intended as a end-of-the-pipeline CLI tool (giving nice human readable format, but only experimental JSON support) and the rewrite is though of as a middle-of-the-pipeline tool (1st-class JSON support).
</sub>

## CLI Usage

```bash
tsc --generateTrace ./trace-json-path
npx @typeslayer/analyze-trace trace-json-path
```

### Examples

```bash
# Analyze a trace file
typeslayer-analyze-trace ./trace.json

# With custom output
typeslayer-analyze-trace ./dist/trace.json > analysis.json
```

## Programmatic Usage

```ts
import { analyzeTrace } from '@typeslayer/analyze-trace';
import { readFileSync } from 'fs';

// Read and parse trace
const traceJson = JSON.parse(readFileSync('trace.json', 'utf-8'));

// Analyze
const result = analyzeTrace(traceJson);

console.log('Hot spots:', result.hotSpots);
console.log('Depth limits:', result.depthLimits);
console.log('Duplicate packages:', result.duplicatePackages);
```

## Analysis Output

The analyzer provides:

### Hot Spot Detection

This is a sliding scale that looks at the events that consumed the most time during compilation.  It's not a given that because something is hot it's necessarily _bad_.  But, the thinking is, if you see something that's much more intensive than something else, it's worth flagging.  So.  There you go.

### Duplicate Package Detection

Package versions appearing in multiple locations from the same package.  This is one of those things that people often have no idea is going on, but in reality most projects have this problem.  Well.  "problem" might be a strong word.  Similar to [Hot Spot Detection](#hot-spot-detection), you'll have to use your judgement here to decide whether it's a big deal or not.  That's largely going to depend on the size/scale/usage of the thing that's duplicated.

### Unterminated Events

In a perfect world, all events created by TypeScript's trace machinery should be terminated.  What's that mean?  Think of it like a missing JSX closing tag.  The thinking here is that if that ever happens, it's guaranteed to be a symptom of something else being wrong - so the tool flags it.

### Depth Limits (unique to `@typeslayer/analyze-trace`)

Type-level limits that were hit during the type checking, including:

- `checkCrossProductUnion_DepthLimit`: triggers `TS(2590) Expression produces a union type that is too complex to represent.`
- `checkTypeRelatedTo_DepthLimit`: triggers `TS(2859) Excessive complexity comparing types '{0}' and '{1}'.` or `TS(2321) Excessive stack depth comparing types '{0}' and '{1}'.`
- `getTypeAtFlowNode_DepthLimit`: triggers `TS(2563) The containing function or module body is too large for control flow analysis.`
- `instantiateType_DepthLimit`: triggers `TS(2589) Type instantiation is excessively deep and possibly infinite.`
- `recursiveTypeRelatedTo_DepthLimit`: This is not currently considered a hard error by the compiler and therefore
    does not report to the user (unless you're a [TypeSlayer](https://github.com/dimitropoulos/typeslayer) user 😉).
- `removeSubtypes_DepthLimit`: triggers `TS(2590) Expression produces a union type that is too complex to represent.`
- `traceUnionsOrIntersectionsTooLarge_DepthLimit`: This is not currently considered a hard error by the compiler and therefore
    does not report to the user (unless you're a [TypeSlayer](https://github.com/dimitropoulos/typeslayer) user 😉).
- `typeRelatedToDiscriminatedType_DepthLimit`: This is not currently considered a hard error by the compiler and therefore
    does not report to the user (unless you're a [TypeSlayer](https://github.com/dimitropoulos/typeslayer) user 😉).

### Type Graph

> [!NOTE]
> As fate would have it, when [TypeSlayer](https://github.com/dimitropoulos/typeslayer) moved from Node.js to Rust to be a Tauri app, this entire package was _again_ rewritten in Rust.  Since this version was fully up-and-running first, and the original has some issues, I decided to just not delete this and publish it in case others stuck in the Node ecosystem (🪦) find it useful.
>
> This particular feature is only in the Rust version.  If you'd like a wasm-build of it or something lemme know.

This is the thing that powers the [TypeSlayer](https://github.com/dimitropoulos/typeslayer) "Type Graph".  It basically takes the `types.json` output and combines it with the information in the `trace.json` to create a list of relations (of various sorts) between all the types in your project.  It also compiles stats for records like "biggest union" and "most commonly included in an intersection" and literally over a doze more like that.
