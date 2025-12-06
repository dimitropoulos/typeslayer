import { createTypeRegistry, type TypeRegistry } from "@typeslayer/validate";
import { useMemo } from "react";
import { useTypesJson } from "../../hooks/tauri-hooks";

// append to window for debugging
declare global {
  interface Window {
    typeRegistry: TypeRegistry;
  }
}

export const useTypeRegistry = () => {
  const { data: typesJson, isSuccess } = useTypesJson();
  const typeRegistry = useMemo(() => {
    const tr = createTypeRegistry(typesJson ?? []);
    window.typeRegistry = tr;
    return tr;
  }, [typesJson]);
  if (!isSuccess || !typesJson) {
    return [];
  }
  return typeRegistry;
};
