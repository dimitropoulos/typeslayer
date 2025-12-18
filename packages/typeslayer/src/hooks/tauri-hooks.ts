import {
  type QueryClient,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AnalyzeTraceResult } from "@typeslayer/analyze-trace/browser";
import {
  extractPackageName,
  type ResolvedType,
  type TraceEvent,
  type TraceJsonSchema,
  type TypeId,
} from "@typeslayer/validate";
import { useEffect } from "react";
import { friendlyPath } from "../components/utils";
import type {
  CompactGraphLink,
  GraphLinkStats,
  GraphNodeStats,
  GraphStats,
  LinkKind,
} from "../types/type-graph";

export type TaskId =
  | "generate_trace"
  | "generate_cpu_profile"
  | "generate_analyze_trace"
  | "generate_type_graph";

export type TaskProgress = {
  taskId: TaskId;
  start: number;
  done: boolean;
};

export function useTaskProgressEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let unlisten: null | (() => void) = null;

    (async () => {
      unlisten = await listen<TaskProgress>(
        "tasks",
        ({ payload: { taskId, start, done } }) => {
          if (done) {
            queryClient.invalidateQueries({ queryKey: ["task", taskId] });
          } else {
            queryClient.setQueryData(["task", taskId], {
              taskId,
              start,
              done,
            });
          }
        },
      );
    })();

    return () => {
      unlisten?.();
    };
  }, [queryClient]);
}

export function useTaskProgress(taskId: TaskId) {
  return useQuery<TaskProgress | null>({
    queryKey: ["task", taskId],
    queryFn: () => null,
    initialData: null,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useAllTaskProgress() {
  const taskIds: TaskId[] = [
    "generate_trace",
    "generate_cpu_profile",
    "generate_analyze_trace",
    "generate_type_graph",
  ];

  const results = useQueries({
    queries: taskIds.map(taskId => ({
      queryKey: ["task", taskId],
      queryFn: () => null,
      initialData: null,
      staleTime: Number.POSITIVE_INFINITY,
    })),
  });

  return results
    .map(result => result.data as TaskProgress | null)
    .filter((data): data is TaskProgress => data !== null);
}

export const useGetRecursiveResolvedTypes = (typeId: TypeId | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery<Record<TypeId, ResolvedType>, unknown>({
    queryKey: ["resolved_type", "recursive", typeId],
    queryFn: () =>
      invoke<Record<TypeId, ResolvedType>>("get_recursive_resolved_types", {
        typeId,
      }),
    enabled: typeId !== undefined,
    staleTime: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    if (!query.isSuccess && query.data) {
      Object.entries(query.data ?? {}).forEach(([id, resolvedType]) => {
        queryClient.setQueryData(["resolved_type", Number(id)], resolvedType);
      });
    }
  }, [query.isSuccess, query.data, queryClient.setQueryData]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
};

export const useGetResolvedTypeById = (typeId: TypeId | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery<ResolvedType | undefined, unknown>({
    queryKey: ["resolved_type", typeId],
    queryFn: () =>
      invoke<ResolvedType | undefined>("get_resolved_type_by_id", { typeId }),
    enabled: typeId !== undefined,
    staleTime: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    if (!query.isSuccess && query.data) {
      queryClient.setQueryData(["resolved_type", typeId], query.data);
    }
  }, [query.isSuccess, query.data, queryClient.setQueryData, typeId]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
};

export const useGetResolvedTypesByIds = (typeIds: TypeId[]) => {
  const queryClient = useQueryClient();

  const query = useQuery<Record<TypeId, ResolvedType>, unknown>({
    queryKey: ["resolved_type", "ids", ...typeIds],
    queryFn: () =>
      invoke<Record<TypeId, ResolvedType>>("get_resolved_types_by_ids", {
        typeIds,
      }),
    enabled: typeIds.length > 0,
    staleTime: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    if (!query.isSuccess && query.data) {
      Object.entries(query.data ?? {}).forEach(([id, resolvedType]) => {
        const typeId = Number(id);
        if (resolvedType) {
          queryClient.setQueryData(["resolved_type", typeId], resolvedType);
        } else {
          queryClient.setQueryData(["resolved_type", typeId], undefined);
        }
      });
    }
  }, [query.isSuccess, query.data, queryClient.setQueryData]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
};

export function useRelativePaths() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["relative_paths"],
    queryFn: () => invoke<boolean>("get_relative_paths"),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const mutation = useMutation({
    mutationFn: (value: boolean) =>
      invoke<void>("set_relative_paths", { value }),
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

  const query = useQuery({
    queryKey: ["prefer_editor_open"],
    queryFn: () => invoke<boolean>("get_prefer_editor_open"),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const mutation = useMutation({
    mutationFn: (value: boolean) =>
      invoke<void>("set_prefer_editor_open", { value }),
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

  const query = useQuery({
    queryKey: ["auto_start"],
    queryFn: () => invoke<boolean>("get_auto_start"),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const mutation = useMutation({
    mutationFn: (value: boolean) => invoke<void>("set_auto_start", { value }),
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

export function useApplyTscProjectFlag() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["apply_tsc_project_flag"],
    queryFn: () => invoke<boolean>("get_apply_tsc_project_flag"),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const mutation = useMutation({
    mutationFn: (value: boolean) =>
      invoke<void>("set_apply_tsc_project_flag", { value }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["get_tsc_example_call"] });
    },
    onSuccess: (_, value) => {
      queryClient.setQueryData(["apply_tsc_project_flag"], value);
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

  const query = useQuery({
    queryKey: ["preferred_editor"],
    queryFn: () => invoke<string | null>("get_preferred_editor"),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const mutation = useMutation({
    mutationFn: (editor: string | null) =>
      invoke<void>("set_preferred_editor", { editor }),
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

  const query = useQuery({
    queryKey: ["extra_tsc_flags"],
    queryFn: () => invoke<string>("get_extra_tsc_flags"),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const defaultQuery = useQuery({
    queryKey: ["default_extra_tsc_flags"],
    queryFn: () => invoke<string>("get_default_extra_tsc_flags"),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const mutation = useMutation({
    mutationFn: (flags: string) =>
      invoke<void>("set_extra_tsc_flags", { flags }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["get_tsc_example_call"] });
    },
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
  return useQuery({
    queryKey: ["available_editors"],
    queryFn: () =>
      invoke<[command: string, label: string][]>("get_available_editors"),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useProjectRoot() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["project_root"],
    queryFn: () => invoke<string>("get_project_root"),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const mutation = useMutation({
    mutationFn: (projectRoot: string) =>
      invoke<void>("set_project_root", { projectRoot }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tsconfig_paths"] });
      queryClient.invalidateQueries({ queryKey: ["selected_tsconfig"] });
      queryClient.invalidateQueries({ queryKey: ["get_tsc_example_call"] });
    },
    onSuccess: (_, projectRoot) => {
      queryClient.setQueryData(["project_root"], projectRoot);
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

export function useGetTracesRelatedToTypeId({ typeId }: { typeId: TypeId }) {
  return useQuery({
    queryKey: ["get_traces_related_to_typeid", typeId],
    queryFn: () =>
      invoke<TraceEvent[]>("get_traces_related_to_typeid", { typeId }),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

/** @deprecated this should be used only for the perfetto page */
export function useTraceJson() {
  return useQuery({
    queryKey: ["trace_json"],
    queryFn: () => invoke<TraceJsonSchema>("get_trace_json"),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useTypeGraphNodesAndLinks() {
  return useQuery({
    queryKey: ["type_graph_nodes_and_links"],
    queryFn: () =>
      invoke<{ nodes: number; links: CompactGraphLink[] }>(
        "get_type_graph_nodes_and_links",
      ),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useTypeGraphStats() {
  return useQuery({
    queryKey: ["type_graph_stats"],
    queryFn: () => invoke<GraphStats>("get_type_graph_stats"),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useTypeGraphNodeAndLinkStats() {
  return useQuery({
    queryKey: ["type_graph_node_and_link_stats"],
    queryFn: () =>
      invoke<{
        linkStats: GraphLinkStats;
        nodeStats: GraphNodeStats;
      }>("get_type_graph_node_and_link_stats"),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useAnalyzeTrace() {
  return useQuery({
    queryKey: ["analyze_trace"],
    queryFn: () => invoke<AnalyzeTraceResult>("get_analyze_trace"),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useCpuProfile() {
  return useQuery({
    queryKey: ["cpu_profile"],
    queryFn: () => invoke<string>("get_cpu_profile"),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useTsconfigPaths() {
  return useQuery({
    queryKey: ["tsconfig_paths"],
    queryFn: () => invoke<string[]>("get_tsconfig_paths"),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

const refreshGenerateTraceInvalidations = new Set([
  "analyze_trace",
  "bug_report_files",
  "bug_report_files",
  "get_analyze_trace_preview",
  "get_app_stats",
  "get_links_to_type_id",
  "get_output_file_sizes",
  "get_trace_json_preview",
  "get_type_graph_preview",
  "get_types_json_preview",
  "resolved_type",
  "trace_json",
  "type_graph_node_and_link_stats",
  "type_graph_nodes_and_links",
  "type_graph_stats",
]);

const refreshGenerateTrace = (queryClient: QueryClient) => async () => {
  refreshGenerateTraceInvalidations.forEach(queryKey => {
    queryClient.invalidateQueries({ queryKey: [queryKey] });
  });
};

export function useGenerateTrace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => invoke<void>("generate_trace"),
    onSettled: refreshGenerateTrace(queryClient),
  });
}

export function useUploadTrace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (filePath: string) =>
      invoke<void>("upload_trace_json", { filePath }),
    onSettled: refreshGenerateTrace(queryClient),
  });
}

export function useUploadTypes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (filePath: string) =>
      invoke<void>("upload_types_json", { filePath }),
    onSettled: refreshGenerateTrace(queryClient),
  });
}

const refreshCpuProfileInvalidations = new Set([
  "cpu_profile",
  "get_cpu_profile_preview",
  "get_output_file_sizes",
  "bug_report_files",
]);

export const refreshCpuProfile = (queryClient: QueryClient) => async () => {
  refreshCpuProfileInvalidations.forEach(queryKey => {
    queryClient.invalidateQueries({ queryKey: [queryKey] });
  });
};

export function useGenerateCpuProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => invoke<void>("generate_cpu_profile"),
    onSettled: refreshCpuProfile(queryClient),
  });
}

export function useUploadCpuProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (filePath: string) =>
      invoke<void>("upload_cpu_profile", { filePath }),
    onSettled: refreshCpuProfile(queryClient),
  });
}

const refreshAnalyzeTraceInvalidations = new Set([
  "analyze_trace",
  "get_analyze_trace_preview",
  "get_output_file_sizes",
  "bug_report_files",
]);

const refreshAnalyzeTrace = (queryClient: QueryClient) => async () => {
  refreshAnalyzeTraceInvalidations.forEach(queryKey => {
    queryClient.invalidateQueries({ queryKey: [queryKey] });
  });
};

export function useGenerateAnalyzeTrace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => invoke<void>("generate_analyze_trace"),
    onSettled: refreshAnalyzeTrace(queryClient),
  });
}

export function useUploadAnalyzeTrace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (filePath: string) =>
      invoke<void>("upload_analyze_trace", { filePath }),
    onSettled: refreshAnalyzeTrace(queryClient),
  });
}

const refreshTypeGraphInvalidations = new Set([
  "type_graph_nodes_and_links",
  "type_graph_node_and_link_stats",
  "type_graph_stats",
  "get_type_graph_preview",
  "get_links_to_type_id",
  "get_output_file_sizes",
  "bug_report_files",
]);

const refreshTypeGraph = (queryClient: QueryClient) => async () => {
  refreshTypeGraphInvalidations.forEach(queryKey => {
    queryClient.invalidateQueries({ queryKey: [queryKey] });
  });
};

export function useGenerateTypeGraph() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => invoke<void>("generate_type_graph"),
    onSettled: refreshTypeGraph(queryClient),
  });
}

export const useGenerateAll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => invoke<void>("generate_all"),
    onMutate: async () => {
      queryClient.invalidateQueries();
    },
  });
};

export function useUploadTypeGraph() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (filePath: string) =>
      invoke<void>("upload_type_graph", { filePath }),
    onSettled: refreshTypeGraph(queryClient),
  });
}

export function useSelectedTsconfig() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["selected_tsconfig"],
    queryFn: () => invoke<string | null>("get_selected_tsconfig"),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const mutation = useMutation({
    mutationFn: (tsconfigPath: string) =>
      invoke<void>("set_selected_tsconfig", { tsconfigPath }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["get_tsc_example_call"] });
    },
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
    mutationFn: (path: string) => invoke<void>("open_file", { path }),
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
  return useQuery({
    queryKey: ["mcp_tool_status"],
    queryFn: () => invoke<ToolProgress[]>("get_tool_status"),
    staleTime: 60_000, // Update frequently to show live progress
    refetchInterval: 60_000, // todo: make this faster later
  });
}

/// Hook to fetch available MCP tool definitions from backend
export function useAvailableTools() {
  return useQuery({
    queryKey: ["available_mcp_tools"],
    queryFn: () => invoke<ToolDefinition[]>("get_available_mcp_tools"),
    staleTime: Number.POSITIVE_INFINITY, // Tool definitions don't change during app lifetime
  });
}

/// Hook to fetch available MCP resources from backend
export function useAvailableResources() {
  return useQuery({
    queryKey: ["available_mcp_resources"],
    queryFn: () => invoke<ManagedResource[]>("get_available_mcp_resources"),
    staleTime: Number.POSITIVE_INFINITY, // Resource definitions don't change during app lifetime
  });
}

export const useOutputFileSizes = () => {
  return useQuery({
    queryKey: ["get_output_file_sizes"],
    queryFn: () => invoke<Record<string, number>>("get_output_file_sizes"),
    staleTime: 5000,
    refetchInterval: 10000,
  });
};

export const useTscExample = () => {
  return useQuery({
    queryKey: ["get_tsc_example_call"],
    queryFn: () => invoke<string>("get_tsc_example_call"),
  });
};

export interface BugReportFile {
  name: string;
  description: string;
}

export const useBugReportFiles = () => {
  return useQuery({
    queryKey: ["bug_report_files"],
    queryFn: () => invoke<BugReportFile[]>("get_bug_report_files"),
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
  return useQuery({
    queryKey: ["data_dir"],
    queryFn: () => invoke<string>("get_data_dir"),
    staleTime: Number.POSITIVE_INFINITY,
  });
};

export const useMaxOldSpaceSize = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["max_old_space_size"],
    queryFn: () => invoke<number | null>("get_max_old_space_size"),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const mutation = useMutation({
    mutationFn: (size: number | null) =>
      invoke<void>("set_max_old_space_size", { size }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["get_tsc_example_call"] });
    },
    onSuccess: (_, size) => {
      queryClient.setQueryData(["max_old_space_size"], size);
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    set: mutation.mutateAsync,
    isSettingValue: mutation.isPending,
  };
};

export const useGetAnalyzeTracePreview = () => {
  return useQuery({
    queryKey: ["get_analyze_trace_preview"],
    queryFn: () => invoke<string>("get_analyze_trace_preview"),
    staleTime: Number.POSITIVE_INFINITY,
  });
};

export const useGetTraceJsonPreview = () => {
  return useQuery({
    queryKey: ["get_trace_json_preview"],
    queryFn: () => invoke<string>("get_trace_json_preview"),
    staleTime: Number.POSITIVE_INFINITY,
  });
};

export const useGetTypesJsonPreview = () => {
  return useQuery({
    queryKey: ["get_types_json_preview"],
    queryFn: () => invoke<string>("get_types_json_preview"),
    staleTime: Number.POSITIVE_INFINITY,
  });
};

export const useGetTypeGraphPreview = () => {
  return useQuery({
    queryKey: ["get_type_graph_preview"],
    queryFn: () => invoke<string>("get_type_graph_preview"),
    staleTime: Number.POSITIVE_INFINITY,
  });
};

export const useGetCpuProfilePreview = () => {
  return useQuery({
    queryKey: ["get_cpu_profile_preview"],
    queryFn: () => invoke<string>("get_cpu_profile_preview"),
    staleTime: Number.POSITIVE_INFINITY,
  });
};

export interface TreemapNode {
  name: string;
  value: number;
  path?: string;
  children?: TreemapNode[];
}

export const useTreemap = () => {
  return useQuery({
    queryKey: ["treemap_data"],
    queryFn: () => invoke<TreemapNode[]>("get_treemap_data"),
    staleTime: Number.POSITIVE_INFINITY,
  });
};

export const useMaxStackSize = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["max_stack_size"],
    queryFn: () => invoke<number | null>("get_max_stack_size"),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const mutation = useMutation({
    mutationFn: (size: number | null) =>
      invoke<void>("set_max_stack_size", { size }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["get_tsc_example_call"] });
    },
    onSuccess: (_, size) => {
      queryClient.setQueryData(["max_stack_size"], size);
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    set: mutation.mutateAsync,
    isSettingValue: mutation.isPending,
  };
};

export const useValidateAnalyzeTrace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => invoke<void>("validate_analyze_trace"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["analyze_trace"] });
      queryClient.invalidateQueries({ queryKey: ["get_output_file_sizes"] });
      queryClient.invalidateQueries({ queryKey: ["bug_report_files"] });
    },
  });
};

export const useValidateTraceJson = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => invoke<void>("validate_trace_json"),
    onSettled: refreshGenerateTrace(queryClient),
  });
};

export const useValidateTypesJson = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => invoke<void>("validate_types_json"),
    onSettled: refreshGenerateTrace(queryClient),
  });
};

export const useValidateTypeGraph = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => invoke<void>("validate_type_graph"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["type_graph"] });
      queryClient.invalidateQueries({ queryKey: ["get_output_file_sizes"] });
      queryClient.invalidateQueries({ queryKey: ["bug_report_files"] });
    },
  });
};

export const useValidateCpuProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => invoke<void>("validate_cpu_profile"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["cpu_profile"] });
      queryClient.invalidateQueries({ queryKey: ["get_output_file_sizes"] });
      queryClient.invalidateQueries({ queryKey: ["bug_report_files"] });
    },
  });
};

export const useCancelGeneration = () => {
  return useMutation({
    mutationFn: async () => invoke<void>("cancel_generation"),
  });
};

export type LinksToType = [LinkKind, [TypeId, string][]][];

export const useGetLinksToTypeId = (typeId: TypeId) => {
  return useQuery({
    queryKey: ["get_links_to_type_id", typeId],
    queryFn: () =>
      invoke<LinksToType>("get_links_to_type_id", {
        typeId,
      }),
    staleTime: Number.POSITIVE_INFINITY,
  });
};

export interface AppStats {
  typesCount: number;
  linksCount: number;
}

export const useGetAppStats = () => {
  return useQuery({
    queryKey: ["get_app_stats"],
    queryFn: () => invoke<AppStats>("get_app_stats"),
    staleTime: Number.POSITIVE_INFINITY,
  });
};

export const useClearOutputs = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cancelRunning: boolean) =>
      invoke<void>("clear_outputs", { cancelRunning }),
    onSettled: () => {
      // Invalidate all queries to clear out the data
      queryClient.invalidateQueries();
    },
  });
};
