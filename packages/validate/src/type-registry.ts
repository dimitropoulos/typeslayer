import type { ResolvedType, TypesJsonFile } from "./types-json";
import type { TypeId } from "./utils";

type AbsolutePath = string;

export type TypeRegistry = Map<TypeId, ResolvedType>;

export const createTypeRegistry = (
	typesJsonFile: TypesJsonFile,
): TypeRegistry => {
	console.log(typesJsonFile.length, "types");
	return new Map(typesJsonFile.map((type) => [type.id, type]));
};
