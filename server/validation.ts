import { z } from "zod";

export const typeId = z.number().int().positive().or(z.literal(-1));

export const position = z.object({
  line: typeId,
  character: z.number(),
});

export const absolutePath = z.string();

export const location = z.object({
  path: absolutePath,
  start: position,
  end: position,
});