import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { AnalyzeTraceResult } from "@typeslayer/analyze-trace/src/utils";
import { extractPackageName, type ResolvedType } from "@typeslayer/validate";
import { friendlyPath } from "../components/utils";
import type { TypeGraph } from "../types/type-graph";

export function useRelativePaths() {
  const queryClient = useQueryClient();

  const query = useQuery<boolean>({
    queryKey: ["relative_paths"],
    queryFn: async () => invoke<boolean>("get_relative_paths"),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const mutation = useMutation({
    mutationFn: async (value: boolean) =>
      invoke("set_relative_paths", { value }),
    onSuccess: (_, value) => {
      queryClient.setQueryData(["relative_paths"], value);
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

export function useExtraTscFlags() {
  const queryClient = useQueryClient();

  const query = useQuery<string>({
    queryKey: ["extra_tsc_flags"],
    queryFn: async () => invoke<string>("get_extra_tsc_flags"),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const defaultQuery = useQuery<string>({
    queryKey: ["default_extra_tsc_flags"],
    queryFn: async () => invoke<string>("get_default_extra_tsc_flags"),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const mutation = useMutation({
    mutationFn: async (flags: string) =>
      invoke("set_extra_tsc_flags", { flags }),
    onSuccess: (_, flags) => {
      queryClient.setQueryData(["extra_tsc_flags"], flags);
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    set: mutation.mutateAsync,
    isSettingValue: mutation.isPending,
    defaultFlags: defaultQuery.data,
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

export function useTypesJson() {
  return useQuery({
    queryKey: ["types_json"],
    queryFn: async () => invoke<ResolvedType[]>("get_types_json"),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useTypeGraph() {
  return useQuery<TypeGraph>({
    queryKey: ["type_graph"],
    queryFn: async () => invoke("get_type_graph"),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useAnalyzeTrace() {
  return useQuery<AnalyzeTraceResult>({
    queryKey: ["analyze_trace"],
    queryFn: async () => invoke("get_analyze_trace"),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useTsconfigPaths() {
  return useQuery<string[]>({
    queryKey: ["tsconfig_paths"],
    queryFn: async () => invoke<string[]>("get_tsconfig_paths"),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

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

export function useOpenFile() {
  return useMutation({
    mutationFn: async (path: string) => invoke("open_file", { path }),
  });
}

export const useFriendlyPackageName = () => {
  const { data: relativePaths } = useRelativePaths();
  const { data: projectRoot } = useProjectRoot();

  if (!relativePaths || !projectRoot) {
    return () => null;
  }

  return (maybePath: string | null) => {
    if (!maybePath) {
      return null;
    }

    const extracted = extractPackageName(maybePath);
    if (extracted !== maybePath) {
      // we were able to extract a package name
      return extracted;
    }

    if (!relativePaths) {
      return maybePath;
    }

    return friendlyPath(maybePath, projectRoot, relativePaths);
  };
};

// MCP Status Types and Hooks
export type ToolStatus = "running" | "success" | "error" | "cancelled";

export interface ToolProgress {
  tool_name: string;
  status: ToolStatus;
  progress: number;
  message?: string;
  started_at: number;
}

export interface ToolDefinition {
  command: string;
  displayName: string;
  description: string;
  parameters: {
    name: string;
    optional: boolean;
    default?: string | number;
    description: string;
  }[];
  returns: Record<string, unknown>;
}

/// Hook to monitor status of active MCP tools
export function useMcpServerStatus() {
  return useQuery<ToolProgress[]>({
    queryKey: ["mcp_tool_status"],
    queryFn: async () => invoke<ToolProgress[]>("get_mcp_tool_status"),
    staleTime: 500, // Update frequently to show live progress
    refetchInterval: 500,
  });
}

/// Generic hook to monitor progress of a specific tool by command
export function useToolProgress(command: string) {
  return useQuery<ToolProgress | null>({
    queryKey: ["mcp_tool_progress", command],
    queryFn: async () =>
      invoke<ToolProgress | null>("get_mcp_tool_progress", {
        tool_name: command,
      }),
    staleTime: 500,
    refetchInterval: 500,
    enabled: !!command,
  });
}

/// Hook to fetch available MCP tool definitions from backend
export function useAvailableTools() {
  return useQuery<ToolDefinition[]>({
    queryKey: ["available_mcp_tools"],
    queryFn: async () => invoke<ToolDefinition[]>("get_available_mcp_tools"),
    staleTime: Number.POSITIVE_INFINITY, // Tool definitions don't change during app lifetime
  });
}

export const useOutputFileSizes = () => {
  return useQuery<Record<string, number>>({
    queryKey: ["get_output_file_sizes"],
    queryFn: async () =>
      invoke<Record<string, number>>("get_output_file_sizes"),
    staleTime: 5000,
    refetchInterval: 10000,
  });
};
