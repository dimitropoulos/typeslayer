import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import {
  ANALYZE_TRACE_FILENAME,
  type AnalyzeTraceResult,
} from "@typeslayer/analyze-trace/browser";
import {
  extractPackageName,
  type ResolvedType,
  TRACE_JSON_FILENAME,
  type TraceJsonSchema,
  TYPES_JSON_FILENAME,
} from "@typeslayer/validate";
import { friendlyPath, serverBaseUrl } from "../components/utils";
import { TYPE_GRAPH_FILENAME, type TypeGraph } from "../types/type-graph";

export function useRelativePaths() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["relative_paths"],
    queryFn: () => invoke<boolean>("get_relative_paths"),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const mutation = useMutation({
    mutationFn: (value: boolean) => invoke("set_relative_paths", { value }),
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
    mutationFn: (value: boolean) => invoke("set_prefer_editor_open", { value }),
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
    mutationFn: (value: boolean) => invoke("set_auto_start", { value }),
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
      invoke("set_apply_tsc_project_flag", { value }),
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
    mutationFn: (flags: string) => invoke("set_extra_tsc_flags", { flags }),
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
      invoke("set_project_root", { projectRoot }),
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

export function useTraceJson() {
  return useQuery({
    queryKey: ["trace_json"],
    queryFn: () => invoke<TraceJsonSchema>("get_trace_json"),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useTypesJson() {
  return useQuery({
    queryKey: ["types_json"],
    queryFn: () => invoke<ResolvedType[]>("get_types_json"),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useTypeGraph() {
  return useQuery({
    queryKey: ["type_graph"],
    queryFn: () => invoke<TypeGraph>("get_type_graph"),
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

const refreshGenerateTrace = (queryClient: QueryClient) => async () => {
  const trace = await invoke("get_trace_json");
  queryClient.setQueryData(["trace_json"], trace);
  queryClient.invalidateQueries({ queryKey: ["outputs", TRACE_JSON_FILENAME] });

  const types = await invoke("get_types_json");
  queryClient.setQueryData(["types_json"], types);
  queryClient.invalidateQueries({ queryKey: ["outputs", TYPES_JSON_FILENAME] });

  queryClient.invalidateQueries({ queryKey: ["type_graph"] });
  queryClient.invalidateQueries({
    queryKey: ["outputs", TYPE_GRAPH_FILENAME],
  });

  queryClient.invalidateQueries({ queryKey: ["analyze_trace"] });
  queryClient.invalidateQueries({
    queryKey: ["outputs", ANALYZE_TRACE_FILENAME],
  });

  queryClient.invalidateQueries({ queryKey: ["type_graph"] });
  queryClient.invalidateQueries({ queryKey: ["outputs", TYPE_GRAPH_FILENAME] });

  queryClient.invalidateQueries({ queryKey: ["get_output_file_sizes"] });
  queryClient.invalidateQueries({ queryKey: ["bug_report_files"] });
};

export function useGenerateTrace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => invoke("generate_trace"),
    onSettled: refreshGenerateTrace(queryClient),
  });
}

export function useUploadTrace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (filePath: string) => invoke("upload_trace_json", { filePath }),
    onSettled: refreshGenerateTrace(queryClient),
  });
}

export function useUploadTypes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (filePath: string) => invoke("upload_types_json", { filePath }),
    onSettled: refreshGenerateTrace(queryClient),
  });
}

export const refreshCpuProfile = (queryClient: QueryClient) => async () => {
  // right now, we don't actually use this in the UI, it's served from the server directly to speedscope
  // const cpuProfile = await invoke("get_cpu_profile");
  // queryClient.setQueryData(["cpu_profile"], cpuProfile);
  // queryClient.setQueryData(["outputs", CPU_PROFILE_FILENAME], cpuProfile);

  queryClient.invalidateQueries({ queryKey: ["get_output_file_sizes"] });
  queryClient.invalidateQueries({ queryKey: ["bug_report_files"] });
};

export function useGenerateCpuProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => invoke("generate_cpu_profile"),
    onSettled: refreshCpuProfile(queryClient),
  });
}

export function useUploadCpuProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (filePath: string) =>
      invoke("upload_cpu_profile", { filePath }),
    onSettled: refreshCpuProfile(queryClient),
  });
}

const refreshAnalyzeTrace = (queryClient: QueryClient) => async () => {
  const analyzeTrace = await invoke("get_analyze_trace");
  queryClient.setQueryData(["analyze_trace"], analyzeTrace);

  queryClient.invalidateQueries({
    queryKey: ["outputs", ANALYZE_TRACE_FILENAME],
  });
  queryClient.invalidateQueries({ queryKey: ["get_output_file_sizes"] });
  queryClient.invalidateQueries({ queryKey: ["bug_report_files"] });
};

export function useGenerateAnalyzeTrace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => invoke("generate_analyze_trace"),
    onSettled: refreshAnalyzeTrace(queryClient),
  });
}

export function useUploadAnalyzeTrace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (filePath: string) =>
      invoke("upload_analyze_trace", { filePath }),
    onSettled: refreshAnalyzeTrace(queryClient),
  });
}

const refreshTypeGraph = (queryClient: QueryClient) => async () => {
  const typeGraph = await invoke("get_type_graph");
  queryClient.setQueryData(["type_graph"], typeGraph);

  queryClient.invalidateQueries({ queryKey: ["outputs", TYPE_GRAPH_FILENAME] });
  queryClient.invalidateQueries({ queryKey: ["get_output_file_sizes"] });
  queryClient.invalidateQueries({ queryKey: ["bug_report_files"] });
};

export function useGenerateTypeGraph() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => invoke("generate_type_graph"),
    onSettled: refreshTypeGraph(queryClient),
  });
}

export function useUploadTypeGraph() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (filePath: string) => invoke("upload_type_graph", { filePath }),
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
      invoke("set_selected_tsconfig", { tsconfigPath }),
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
    mutationFn: (path: string) => invoke("open_file", { path }),
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
      invoke("set_max_old_space_size", { size }),
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

export const useGetAnalyzeTraceText = () => {
  return useQuery({
    queryKey: ["get_analyze_trace_text"],
    queryFn: () => invoke<string>("get_analyze_trace_text"),
    staleTime: Number.POSITIVE_INFINITY,
  });
};

export const useGetTraceJsonText = () => {
  return useQuery({
    queryKey: ["get_trace_json_text"],
    queryFn: () => invoke<string>("get_trace_json_text"),
    staleTime: Number.POSITIVE_INFINITY,
  });
};

export const useGetTypesJsonText = () => {
  return useQuery({
    queryKey: ["get_types_json_text"],
    queryFn: () => invoke<string>("get_types_json_text"),
    staleTime: Number.POSITIVE_INFINITY,
  });
};

export const useGetTypeGraphText = () => {
  return useQuery({
    queryKey: ["get_type_graph_text"],
    queryFn: () => invoke<string>("get_type_graph_text"),
    staleTime: Number.POSITIVE_INFINITY,
  });
};

export const useGetCpuProfileText = () => {
  return useQuery({
    queryKey: ["get_cpu_profile_text"],
    queryFn: () => invoke<string>("get_cpu_profile_text"),
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

// technically not tauri but yolo
export const useStaticFile = (fileName: string) => {
  return useQuery({
    queryKey: ["outputs", fileName],
    queryFn: async () => {
      const response = await fetch(`${serverBaseUrl}/outputs/${fileName}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${fileName}: ${response.statusText}`);
      }
      return response.text();
    },
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
    mutationFn: (size: number | null) => invoke("set_max_stack_size", { size }),
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

export const useVerifyAnalyzeTrace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => invoke<void>("verify_analyze_trace"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["analyze_trace"] });
      queryClient.invalidateQueries({
        queryKey: ["outputs", ANALYZE_TRACE_FILENAME],
      });
      queryClient.invalidateQueries({ queryKey: ["get_output_file_sizes"] });
      queryClient.invalidateQueries({ queryKey: ["bug_report_files"] });
    },
  });
};

export const useVerifyTraceJson = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => invoke<void>("verify_trace_json"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trace_json"] });
      queryClient.invalidateQueries({
        queryKey: ["outputs", TRACE_JSON_FILENAME],
      });
      queryClient.invalidateQueries({ queryKey: ["get_output_file_sizes"] });
      queryClient.invalidateQueries({ queryKey: ["bug_report_files"] });
    },
  });
};

export const useVerifyTypesJson = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => invoke<void>("verify_types_json"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["types_json"] });
      queryClient.invalidateQueries({
        queryKey: ["outputs", TYPES_JSON_FILENAME],
      });
      queryClient.invalidateQueries({ queryKey: ["get_output_file_sizes"] });
      queryClient.invalidateQueries({ queryKey: ["bug_report_files"] });
    },
  });
};

export const useVerifyTypeGraph = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => invoke<void>("verify_type_graph"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["type_graph"] });
      queryClient.invalidateQueries({
        queryKey: ["outputs", TYPE_GRAPH_FILENAME],
      });
      queryClient.invalidateQueries({ queryKey: ["get_output_file_sizes"] });
      queryClient.invalidateQueries({ queryKey: ["bug_report_files"] });
    },
  });
};

export const useVerifyCpuProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => invoke<void>("verify_cpu_profile"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["cpu_profile"] });
      queryClient.invalidateQueries({ queryKey: ["get_output_file_sizes"] });
      queryClient.invalidateQueries({ queryKey: ["bug_report_files"] });
    },
  });
};
