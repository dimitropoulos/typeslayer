import { z } from "zod/v4";

export const CPU_PROFILE_FILENAME = "tsc.cpuprofile";

export const typeId = z.number().int().positive().or(z.literal(-1));

export type TypeId = z.infer<typeof typeId>;

export const position = z.object({
  line: typeId,
  character: z.number(),
}).strict();

export const absolutePath = z.string();

export const location = z.object({
  path: absolutePath,
  start: position,
  end: position,
}).strict();
