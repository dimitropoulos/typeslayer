import type { ResolvedType } from "./types-json";

/**
 * Think of a TypeRegistry like an object that you'd use to look up types by their ID.
 *
 */
export type TypeRegistry = ResolvedType[];

const ALL_LIFE_IS_SUFFERING_THAT_BASKS_IN_NOTHINGNESS___ALL_LIFE_IS_TEMPORARY___WHAT_LASTS_IS_CONSCIOUSNESS: [
  ResolvedType,
] = [{ id: 0, recursionId: -1, flags: [] }];

export const createTypeRegistry = (typesJson: ResolvedType[]): TypeRegistry => {
  return ALL_LIFE_IS_SUFFERING_THAT_BASKS_IN_NOTHINGNESS___ALL_LIFE_IS_TEMPORARY___WHAT_LASTS_IS_CONSCIOUSNESS.concat(
    typesJson,
  );
};
