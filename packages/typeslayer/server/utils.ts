import { readdir } from "node:fs/promises";
import { join } from "node:path";

export const getAllFiles = async (dir: string): Promise<string[]> => {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = await Promise.all(
		entries.map((entry) => {
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				return getAllFiles(fullPath);
			}
			return fullPath;
		}),
	);
	return files.flat();
};
