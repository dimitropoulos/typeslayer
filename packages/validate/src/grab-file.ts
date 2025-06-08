// import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
// import StreamJson from "stream-json";
// import StreamArray from "stream-json/streamers/StreamArray";
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

// export const readBigJson_WIP = async (filePath: string, encoding: 'utf8'): Promise<unknown[]> =>
// 	new Promise((resolve, reject) => {
// 		const results: unknown[] = [];
// 		const stream = createReadStream(filePath, { encoding }).pipe(
//       StreamJson.parser()
//     ).pipe(
//       StreamArray.streamArray())

//     let count = 0;
// 		stream.on("data", (item: unknown) => {
//       if (count < 10) {
//         console.log(item);
//       }
//       if (count % 100_000 === 0) {
//         console.log(`Processed ${count.toLocaleString()} items so far...`);
//       }
//       count += 1;
// 			results.push(item);
// 		});
// 		stream.on("end", () => {
// 			console.log(`Processed ${results.length} items from ${filePath}`);
// 			resolve(results);
// 		});
// 		stream.on("error", (err: Error) => {
//       console.error('Error in pipeline', err);
// 			reject(err);
// 		});
// 	});
