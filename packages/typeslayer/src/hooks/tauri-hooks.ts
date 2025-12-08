import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { AnalyzeTraceResult } from "@typeslayer/analyze-trace/browser";
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
      queryClient.invalidateQueries({ queryKey: ["get_tsc_example_call"] });
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
      queryClient.invalidateQueries({ queryKey: ["get_tsc_example_call"] });
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
      queryClient.invalidateQueries({ queryKey: ["get_tsc_example_call"] });
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

export interface ToolProgress {
  command: string;
  startedAt: number;
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

export interface ManagedResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/// Hook to monitor status of active MCP tools
export function useMcpToolStatus() {
  return useQuery<ToolProgress[]>({
    queryKey: ["mcp_tool_status"],
    queryFn: async () => invoke<ToolProgress[]>("get_tool_status"),
    staleTime: 500, // Update frequently to show live progress
    refetchInterval: 500,
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

/// Hook to fetch available MCP resources from backend
export function useAvailableResources() {
  return useQuery<ManagedResource[]>({
    queryKey: ["available_mcp_resources"],
    queryFn: async () =>
      invoke<ManagedResource[]>("get_available_mcp_resources"),
    staleTime: Number.POSITIVE_INFINITY, // Resource definitions don't change during app lifetime
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

export const useTscExample = () => {
  return useQuery<string>({
    queryKey: ["get_tsc_example_call"],
    queryFn: async () => invoke<string>("get_tsc_example_call"),
  });
};

export interface BugReportFile {
  name: string;
  description: string;
}

export const useBugReportFiles = () => {
  return useQuery<BugReportFile[]>({
    queryKey: ["bug_report_files"],
    queryFn: async () => invoke<BugReportFile[]>("get_bug_report_files"),
    staleTime: 5000,
  });
};

export const useCreateBugReport = () => {
  const mutation = useMutation({
    mutationFn: async (params: {
      description: string;
      stdout?: string;
      stderr?: string;
    }) => invoke<string>("create_bug_report", params),
  });

  return {
    submit: mutation.mutateAsync,
    isSubmitting: mutation.isPending,
    error: mutation.error,
  };
};

export const useDataDir = () => {
  return useQuery<string>({
    queryKey: ["data_dir"],
    queryFn: async () => invoke<string>("get_data_dir"),
    staleTime: Number.POSITIVE_INFINITY,
  });
};
