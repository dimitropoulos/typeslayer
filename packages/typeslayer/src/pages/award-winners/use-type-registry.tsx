import type { ResolvedType } from "@typeslayer/validate";
import { useTypesJson } from "../../hooks/tauri-hooks";

export const useTypeRegistry = () => {
	const { data: typesJson } = useTypesJson();

	return [
		{ id: 0, recursionId: -1, flags: [] } as ResolvedType,
		...(typesJson ?? []),
	] as ResolvedType[];
};
