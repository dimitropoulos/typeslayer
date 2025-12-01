import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

// Settings Hooks
export function useSimplifyPaths() {
	const queryClient = useQueryClient();

	const query = useQuery<boolean>({
		queryKey: ["simplify_paths"],
		queryFn: async () => invoke<boolean>("get_simplify_paths"),
		staleTime: Number.POSITIVE_INFINITY,
	});

	const mutation = useMutation({
		mutationFn: async (value: boolean) =>
			invoke("set_simplify_paths", { value }),
		onSuccess: (_, value) => {
			queryClient.setQueryData(["simplify_paths"], value);
		},
	});

	return {
		data: query.data,
		isLoading: query.isLoading,
		error: query.error,
		set: mutation.mutateAsync,
		isSettingValue: mutation.isPending,
	};
}

export function usePreferEditorOpen() {
	const queryClient = useQueryClient();

	const query = useQuery<boolean>({
		queryKey: ["prefer_editor_open"],
		queryFn: async () => invoke<boolean>("get_prefer_editor_open"),
		staleTime: Number.POSITIVE_INFINITY,
	});

	const mutation = useMutation({
		mutationFn: async (value: boolean) =>
			invoke("set_prefer_editor_open", { value }),
		onSuccess: (_, value) => {
			queryClient.setQueryData(["prefer_editor_open"], value);
		},
	});

	return {
		data: query.data,
		isLoading: query.isLoading,
		error: query.error,
		set: mutation.mutateAsync,
		isSettingValue: mutation.isPending,
	};
}

export function useAutoStart() {
	const queryClient = useQueryClient();

	const query = useQuery<boolean>({
		queryKey: ["auto_start"],
		queryFn: async () => invoke<boolean>("get_auto_start"),
		staleTime: Number.POSITIVE_INFINITY,
	});

	const mutation = useMutation({
		mutationFn: async (value: boolean) => invoke("set_auto_start", { value }),
		onSuccess: (_, value) => {
			queryClient.setQueryData(["auto_start"], value);
		},
	});

	return {
		data: query.data,
		isLoading: query.isLoading,
		error: query.error,
		set: mutation.mutateAsync,
		isSettingValue: mutation.isPending,
	};
}

export function usePreferredEditor() {
	const queryClient = useQueryClient();

	const query = useQuery<string | null>({
		queryKey: ["preferred_editor"],
		queryFn: async () => invoke<string | null>("get_preferred_editor"),
		staleTime: Number.POSITIVE_INFINITY,
	});

	const mutation = useMutation({
		mutationFn: async (editor: string | null) =>
			invoke("set_preferred_editor", { editor }),
		onSuccess: (_, editor) => {
			queryClient.setQueryData(["preferred_editor"], editor);
		},
	});

	return {
		data: query.data,
		isLoading: query.isLoading,
		error: query.error,
		set: mutation.mutateAsync,
		isSettingValue: mutation.isPending,
	};
}

export function useAvailableEditors() {
	return useQuery<Array<[string, string]>>({
		queryKey: ["available_editors"],
		queryFn: async () =>
			invoke<Array<[string, string]>>("get_available_editors"),
		staleTime: Number.POSITIVE_INFINITY,
	});
}

// Project Root Hook
export function useProjectRoot() {
	const queryClient = useQueryClient();

	const query = useQuery<string>({
		queryKey: ["project_root"],
		queryFn: async () => invoke<string>("get_project_root"),
		staleTime: Number.POSITIVE_INFINITY,
	});

	const mutation = useMutation({
		mutationFn: async (projectRoot: string) =>
			invoke("set_project_root", { projectRoot }),
		onSuccess: (_, projectRoot) => {
			queryClient.setQueryData(["project_root"], projectRoot);
			queryClient.invalidateQueries({ queryKey: ["tsconfig_paths"] });
			queryClient.invalidateQueries({ queryKey: ["selected_tsconfig"] });
		},
	});

	return {
		data: query.data,
		isLoading: query.isLoading,
		error: query.error,
		set: mutation.mutateAsync,
		isSettingValue: mutation.isPending,
	};
}

// Types JSON Hook
export function useTypesJson() {
	return useQuery<unknown[]>({
		queryKey: ["types_json"],
		queryFn: async () => invoke("get_types_json"),
		staleTime: Number.POSITIVE_INFINITY,
	});
}

// Analyze Trace Hook
export function useAnalyzeTrace() {
	return useQuery({
		queryKey: ["analyze_trace"],
		queryFn: async () => invoke("get_analyze_trace"),
		staleTime: Number.POSITIVE_INFINITY,
	});
}

// Package Scripts Hook
// Tsconfig Paths Hook
export function useTsconfigPaths() {
	return useQuery<string[]>({
		queryKey: ["tsconfig_paths"],
		queryFn: async () => invoke<string[]>("get_tsconfig_paths"),
		staleTime: Number.POSITIVE_INFINITY,
	});
}

// Selected Tsconfig Hook
export function useSelectedTsconfig() {
	const queryClient = useQueryClient();

	const query = useQuery<string | null>({
		queryKey: ["selected_tsconfig"],
		queryFn: async () => invoke<string | null>("get_selected_tsconfig"),
		staleTime: Number.POSITIVE_INFINITY,
	});

	const mutation = useMutation({
		mutationFn: async (tsconfigPath: string) =>
			invoke("set_selected_tsconfig", { tsconfigPath }),
		onSuccess: (_, tsconfigPath) => {
			queryClient.setQueryData(["selected_tsconfig"], tsconfigPath || null);
		},
	});

	return {
		data: query.data,
		isLoading: query.isLoading,
		error: query.error,
		set: mutation.mutateAsync,
		isSettingValue: mutation.isPending,
	};
}

// Open File Action (not a query, just a mutation)
export function useOpenFile() {
	return useMutation({
		mutationFn: async (path: string) => invoke("open_file", { path }),
	});
}
