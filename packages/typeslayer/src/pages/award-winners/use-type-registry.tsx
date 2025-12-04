import { createTypeRegistry } from "@typeslayer/validate";
import { useMemo } from "react";
import { useTypesJson } from "../../hooks/tauri-hooks";

export const useTypeRegistry = () => {
  const { data: typesJson, isSuccess } = useTypesJson();
  const typeRegistry = useMemo(
    () => createTypeRegistry(typesJson ?? []),
    [typesJson],
  );
  if (!isSuccess || !typesJson) {
    return [];
  }
  return typeRegistry;
};
