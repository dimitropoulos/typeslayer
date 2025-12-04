# @typeslayer/validate

Validation schemas and utilities for TypeScript compiler trace analysis. This package provides comprehensive Zod-based schema validation (and types!!) for trace events, type metrics, and analysis results.

## Usage

### Trace JSON Validation

```ts
import { traceJsonSchema, type TraceEvent } from '@typeslayer/validate';

// Validate trace.json output from TypeScript compiler
const events: TraceEvent[] = traceJsonSchema.parse(jsonData);

// Or use with Node.js streams
import { createReadStream } from 'fs';
import { validateTraceJson } from '@typeslayer/validate/node';

const stream = createReadStream('trace.json');
const events = await validateTraceJson(stream);
```

### Types JSON Validation

```ts
import { typesJsonSchema, type TypesJsonSchema } from '@typeslayer/validate';

const types: TypesJsonSchema = typesJsonSchema.parse(jsonData);
```

### CPU Profile Validation

```ts
import { tscCpuProfileSchema } from '@typeslayer/validate';

const profile = tscCpuProfileSchema.parse(jsonData);
```

## Exports

- **Main export (`@typeslayer/validate`)**: Browser-compatible validation schemas
  - `traceJsonSchema` - Validates TypeScript trace events
  - `typesJsonSchema` - Validates type information
  - `tscCpuProfileSchema` - Validates CPU profile data
  
- **Node export (`@typeslayer/validate/node`)**: Node.js-specific utilities
  - `validateTraceJson()` - Stream-based trace validation
  - `readTraceJson()` - Read and parse trace.json files

## TypeScript Support

Full TypeScript support with type inference from schemas:

```ts
import type { TraceEvent } from '@typeslayer/validate';

// Type-safe event handling
function processEvent(event: TraceEvent) {
  switch (event.name) {
    case 'createSourceFile':
      console.log('Creating source file:', event.args.path);
      break;
    // ... other event types
  }
}
```
