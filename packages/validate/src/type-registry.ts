import { readFile } from "node:fs/promises";
import {
	type ResolvedType,
	type TypesJsonFile,
	typesJsonFile,
} from "./types-json";
import type { TypeId } from "./utils";

type AbsolutePath = string;

export const createTypeRegistryFromDir = async (
	dir: AbsolutePath,
): Promise<TypeRegistry> => {
	const fileName = `${dir}/types.json`;
	console.log("reading file", fileName);
	const typesFileContent = await readFile(fileName, "utf8");
	console.log("parsing JSON");
	const typesParsedUnvalidated = JSON.parse(typesFileContent);
	console.log("Zod validating");
	const typesParsed = typesJsonFile.parse(typesParsedUnvalidated);
	
	console.log("creating registry");
	return createTypeRegistry(typesParsed);
};

export type TypeRegistry = Map<TypeId, ResolvedType>;

export const createTypeRegistry = (
	typesJsonFile: TypesJsonFile,
): TypeRegistry => {
	console.log(typesJsonFile.length, "types")
	return new Map(typesJsonFile.map((type) => [type.id, type]));
};

