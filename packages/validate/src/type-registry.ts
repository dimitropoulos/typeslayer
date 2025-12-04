import type { ResolvedType, TypesJsonSchema } from "./types-json";
import type { TypeId } from "./utils";

export type TypeRegistry = Map<TypeId, ResolvedType>;

export const createTypeRegistry = (
	typesJson: TypesJsonSchema,
): TypeRegistry => {
	return new Map(typesJson.map((type) => [type.id, type]));
};
