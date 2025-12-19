import { Insights } from "@mui/icons-material";
import { Alert, Button, Stack } from "@mui/material";
import { useCallback, useState } from "react";
import { BigAction } from "../../components/big-action";
import { useLogoFade } from "../../contexts/logo-fade-context";
import { useCancelGeneration, useClearOutputs } from "../../hooks/tauri-hooks";
import { ErrorDialog } from "./error-dialog";
import { Step } from "./step";

export const Step3Diagnostics = () => {
  const { startGeneratingAll: triggerLogoFade } = useLogoFade();

  const { mutateAsync: clearOutputs } = useClearOutputs();
  const { mutateAsync: cancelGeneration } = useCancelGeneration();

  // Processing state
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

  // Sequential processing logic
  const processTypes = useCallback(async () => {
    setIsProcessing(true);
    setProcessingError(null);
    setProcessingErrorStdout(null);
    setProcessingErrorStderr(null);
    setIsErrorDialogOpen(false);

    try {
      // This calls onGenerateAll and waits for it to complete
      await triggerLogoFade();
    } catch (e) {
      const rawMessage = e instanceof Error ? e.message : String(e);
      const normalizedMessage = normalizeInvokeError(rawMessage);
      if (normalizedMessage.toLowerCase().includes("cancel")) {
        setProcessingError(null);
        setProcessingErrorStdout(null);
        setProcessingErrorStderr(null);
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
  }, [triggerLogoFade]);

  const handleClearOrCancel = useCallback(async () => {
    setIsClearingOutputs(true);
    try {
      if (isProcessing) {
        // Cancel any running generation
        await cancelGeneration();
        setIsProcessing(false);
      } else {
        // Clear outputs when not processing
        await clearOutputs(false);
        setProcessingError(null);
        setProcessingErrorStdout(null);
        setProcessingErrorStderr(null);
        setIsErrorDialogOpen(false);
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
  }, [isProcessing, clearOutputs, cancelGeneration]);

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
              taskId="generate_trace"
            />
            <BigAction
              title="CPU Profile"
              description="a v8 CPU profile from the TypeScript compiler during type checking (a critical tool for identifying bottlenecks)"
              unlocks={["SpeedScope"]}
              taskId="generate_cpu_profile"
            />
            <BigAction
              title="Analyze Hot Spots"
              description="identifies computational hot-spots in your type checking, duplicate type packages inclusions, and unterminated events"
              unlocks={["Treemap", "Award Winners"]}
              taskId="generate_analyze_trace"
            />
            <BigAction
              title="Type Graph"
              description="creates a graph of all types and their relationships to visualize complex type dependencies"
              unlocks={["Type Graph"]}
              taskId="generate_type_graph"
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
