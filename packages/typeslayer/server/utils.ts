import { readdir, writeFile } from "node:fs/promises";
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

export const updateLogFile = (tempDir: string) => {
	return writeFile(
		`${tempDir}/typeslayer.json`,
		JSON.stringify(
			{
				completed: Date.now(),
			},
			null,
			2,
		),
	);
};
