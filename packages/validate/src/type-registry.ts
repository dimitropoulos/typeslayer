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
	const typesFileContent = await readFile(`${dir}/types.json`, "utf8");
	const typesParsedUnvalidated = JSON.parse(typesFileContent);
	const typesParsed = typesJsonFile.parse(typesParsedUnvalidated);

	return createTypeRegistry(typesParsed);
};

export type TypeRegistry = Map<TypeId, ResolvedType>;

export const createTypeRegistry = (
	typesJsonFile: TypesJsonFile,
): TypeRegistry => {
	return new Map(typesJsonFile.map((type) => [type.id, type]));
};

