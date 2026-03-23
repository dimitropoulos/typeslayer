import { readFile } from "node:fs/promises";
import { type z, prettifyError } from "zod/v4";

export const grabFile = async <V extends z.ZodType>(
  filePath: string,
  validator: V,
) => {
  const json = await readSmallJson(filePath, "utf8");
  const parsed = await validator.safeParseAsync(json);
  if (!parsed.success) {
    throw new Error(
      `Error parsing file ${filePath}\n${prettifyError(parsed.error)}`,
    );
  }
  return parsed.data;
};

export const readSmallJson = async (
  filePath: string,
  encoding: "utf8",
): Promise<unknown> => {
  const fileString = await readFile(filePath, { encoding });
  const parsed = JSON.parse(fileString);
  return parsed;
};
