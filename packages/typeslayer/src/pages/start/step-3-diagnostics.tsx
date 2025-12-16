import { Insights } from "@mui/icons-material";
import { Alert, Button, Stack } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useState,
} from "react";
import { BigAction } from "../../components/big-action";
import {
  useGenerateAnalyzeTrace,
  useGenerateCpuProfile,
  useGenerateTrace,
  useGenerateTypeGraph,
} from "../../hooks/tauri-hooks";
import { ErrorDialog } from "./error-dialog";
import { Step } from "./step";

export const Step3Diagnostics = ({
  setIsFading,
  setFadePhase,
}: {
  setIsFading: Dispatch<SetStateAction<boolean>>;
  setFadePhase: Dispatch<SetStateAction<0 | 1 | 2>>;
}) => {
  const navigate = useNavigate();

  // Processing state
  const [processingStep, setProcessingStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [processingErrorStdout, setProcessingErrorStdout] = useState<
    string | null
  >(null);
  const [processingErrorStderr, setProcessingErrorStderr] = useState<
    string | null
  >(null);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [isClearingOutputs, setIsClearingOutputs] = useState(false);

  const { mutateAsync: onGenerateTrace } = useGenerateTrace();
  const { mutateAsync: onGenerateCpuProfile } = useGenerateCpuProfile();
  const { mutateAsync: onGenerateAnalyzeTrace } = useGenerateAnalyzeTrace();
  const { mutateAsync: onGenerateTypeGraph } = useGenerateTypeGraph();

  // Sequential processing logic
  const processTypes = useCallback(async () => {
    setIsProcessing(true);
    setProcessingError(null);
    setProcessingErrorStdout(null);
    setProcessingErrorStderr(null);
    setIsErrorDialogOpen(false);

    try {
      // 1. generate_trace
      setProcessingStep(0);
      await onGenerateTrace();

      // 2. generate_cpu_profile
      setProcessingStep(1);
      await onGenerateCpuProfile();

      // 3. generate_analyze_trace
      setProcessingStep(2);
      await onGenerateAnalyzeTrace();

      // 4. build relations graph
      setProcessingStep(3);
      await onGenerateTypeGraph();

      // done: trigger fade-to-black, animate logo morph over 1000ms, then navigate
      setProcessingStep(4);
      setIsFading(true);
      setFadePhase(1);
      setTimeout(() => setFadePhase(2), 500);
      setTimeout(() => {
        navigate({
          to: "/type-graph",
        });
      }, 1500);
    } catch (e) {
      const rawMessage = e instanceof Error ? e.message : String(e);
      const normalizedMessage = normalizeInvokeError(rawMessage);
      if (normalizedMessage.toLowerCase().includes("cancel")) {
        setProcessingError(null);
        setProcessingErrorStdout(null);
        setProcessingErrorStderr(null);
        setProcessingStep(0);
      } else {
        const { summary, stdout, stderr } =
          splitCompilerError(normalizedMessage);
        setProcessingError(summary);
        setProcessingErrorStdout(stdout);
        setProcessingErrorStderr(stderr);
        setIsErrorDialogOpen(true);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [
    navigate,
    onGenerateTrace,
    onGenerateCpuProfile,
    onGenerateAnalyzeTrace,
    onGenerateTypeGraph,
    setFadePhase,
    setIsFading,
  ]);

  const handleClearOrCancel = useCallback(async () => {
    setIsClearingOutputs(true);
    try {
      await invoke<void>("clear_outputs", { cancelRunning: isProcessing });
      setProcessingError(null);
      setProcessingErrorStdout(null);
      setProcessingErrorStderr(null);
      setIsErrorDialogOpen(false);
      setProcessingStep(0);
      if (isProcessing) {
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Failed to clear outputs:", error);
      const rawMessage = error instanceof Error ? error.message : String(error);
      const normalizedMessage = normalizeInvokeError(rawMessage);
      const { summary, stdout, stderr } = splitCompilerError(normalizedMessage);
      setProcessingError(summary);
      setProcessingErrorStdout(stdout);
      setProcessingErrorStderr(stderr);
      setIsErrorDialogOpen(true);
    } finally {
      setIsClearingOutputs(false);
    }
  }, [isProcessing]);

  return (
    <>
      <Step step={3}>
        <Stack flexDirection="column" gap={2}>
          {processingError && (
            <Alert
              severity="error"
              action={
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => setIsErrorDialogOpen(true)}
                >
                  View details
                </Button>
              }
            >
              {processingError}
            </Alert>
          )}
          <Stack sx={{ gap: 2, flexDirection: "row", flexWrap: "wrap" }}>
            <BigAction
              title="Identify Types"
              description="generates event traces and and identification for all types from the TypeScript compiler checking your codebase"
              unlocks={["Search Types", "Perfetto"]}
              isLoading={isProcessing && processingStep === 0}
            />
            <BigAction
              title="CPU Profile"
              description="a v8 CPU profile from the TypeScript compiler during type checking (a critical tool for identifying bottlenecks)"
              unlocks={["SpeedScope"]}
              isLoading={isProcessing && processingStep === 1}
            />
            <BigAction
              title="Analyze Hot Spots"
              description="identifies computational hot-spots in your type checking, duplicate type packages inclusions, and unterminated events"
              unlocks={["Treemap", "Award Winners"]}
              isLoading={isProcessing && processingStep === 2}
            />
            <BigAction
              title="Type Graph"
              description="creates a graph of all types and their relationships to visualize complex type dependencies"
              unlocks={["Type Graph"]}
              isLoading={isProcessing && processingStep === 3}
            />
          </Stack>
          <Stack direction="row" gap={2} alignItems="center">
            <Button
              variant="contained"
              size="large"
              onClick={processTypes}
              disabled={isProcessing}
              loading={isProcessing}
              loadingPosition="start"
              startIcon={<Insights />}
              sx={{ alignSelf: "start" }}
            >
              Run Diagnostics
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={handleClearOrCancel}
              loading={isClearingOutputs}
            >
              {isProcessing ? "Cancel" : "Clear"}
            </Button>
          </Stack>
        </Stack>
      </Step>
      <ErrorDialog
        processingErrorStderr={processingErrorStderr}
        processingErrorStdout={processingErrorStdout}
        processingError={processingError}
        open={isErrorDialogOpen}
        onClose={() => setIsErrorDialogOpen(false)}
      />
    </>
  );
};

type CompilerErrorParts = {
  summary: string;
  details: string | null;
  stdout: string | null;
  stderr: string | null;
};

const normalizeInvokeError = (message: string) => {
  const invokePrefix = /^InvokeError:\s*/i;
  let normalized = message.replace(invokePrefix, "").trim();
  const quoted = normalized.match(/^"([\s\S]*)"$/);
  if (quoted) {
    normalized = quoted[1].replace(/\\"/g, '"');
  }
  return normalized.trim();
};

const splitCompilerError = (message: string): CompilerErrorParts => {
  const stdoutIndex = message.indexOf("STDOUT:");
  if (stdoutIndex === -1) {
    return {
      summary: message,
      details: message,
      stdout: null,
      stderr: null,
    };
  }
  const beforeStdout = message.slice(0, stdoutIndex).trim();
  const rest = message.slice(stdoutIndex);
  const stderrIndex = rest.indexOf("STDERR:");
  let stdoutContent = rest;
  let stderrContent: string | undefined;
  if (stderrIndex !== -1) {
    stdoutContent = rest.slice(0, stderrIndex);
    stderrContent = rest.slice(stderrIndex);
  }
  const normalizedStdout = stdoutContent.replace(/^STDOUT:\s*/i, "").trim();
  const normalizedStderr = stderrContent?.replace(/^STDERR:\s*/i, "").trim();
  const detailSections = [] as string[];
  if (normalizedStdout) {
    detailSections.push(`STDOUT:\n${normalizedStdout}`);
  }
  if (normalizedStderr) {
    detailSections.push(`STDERR:\n${normalizedStderr}`);
  }
  const details = detailSections.length ? detailSections.join("\n\n") : message;
  return {
    summary: beforeStdout || "TypeScript compilation failed",
    details,
    stdout: normalizedStdout || null,
    stderr: normalizedStderr || null,
  };
};
