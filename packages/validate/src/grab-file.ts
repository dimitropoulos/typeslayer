import { readFile } from "node:fs/promises";
import type { z } from "zod/v4";

export const grabFile = async <V extends z.ZodType>(
	filePath: string,
	validator: V,
) => {
	console.log("grabFile:", filePath);
	const json = await readSmallJson(filePath, "utf8");
	const parsed = await validator.safeParseAsync(json);
	if (!parsed.success) {
		console.error("Error parsing file", { filePath, parsed });
		throw new Error(`Error parsing file ${filePath}`);
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
