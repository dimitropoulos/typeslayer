import { english } from "./en";

type Translations = typeof english;

/** Recursively builds every valid dot-separated path to a leaf string. */
type DotPath<T, Prefix extends string = ""> = T extends unknown ? {
  [K in keyof T & string]: T[K] extends Record<string, unknown>
    ? DotPath<T[keyof T & string], `${Prefix}${K}.`>
    : `${Prefix}${K}`;
}[keyof T & string] : never;

/** Walks the object type along a dot path and resolves the leaf value. */
type DotGet<T, P extends string> = P extends `${infer Head}.${infer Tail}`
  ? Head extends keyof T
    ? DotGet<T[Head], Tail>
    : never
  : P extends keyof T
    ? T[P]
    : never;

type Prettify<T> = {
  [K in keyof T]: T[K];
};

export type TranslationKey = Prettify<DotPath<Translations>>;

export function translate<P extends TranslationKey>(
  path: P,
): DotGet<Translations, P> {
  const keys = path.split(".");
  let result: unknown = english;
  for (const key of keys) {
    result = (result as Record<string, unknown>)[key];
  }
  return result as DotGet<Translations, P>;
}

/** Runtime lookup — accepts any string, returns the value or undefined. */
export function lookup(path: string): string | undefined {
  const keys = path.split(".");
  let result: unknown = english;
  for (const key of keys) {
    if (result == null || typeof result !== "object") return undefined;
    result = (result as Record<string, unknown>)[key];
  }
  return typeof result === "string" ? result : undefined;
}

/** Collect every valid dot-path at runtime. */
export function allKeys(obj: Record<string, unknown> = english, prefix = ""): string[] {
  const result: string[] = [];
  for (const key of Object.keys(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      result.push(...allKeys(val as Record<string, unknown>, full));
    } else {
      result.push(full);
    }
  }
  return result;
}
