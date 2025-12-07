import { ExpandMore, Help, Pause, TaskAlt } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { Code } from "../components/code";
import { InlineCode } from "../components/inline-code";
import {
  type ToolDefinition,
  useAvailableTools,
  useMcpServerStatus,
  useToolProgress,
} from "../hooks/tauri-hooks";

export const AiMcpProgress = () => {
  const { data: activeTools } = useMcpServerStatus();

  // If there are active tools, show progress indicator
  if (activeTools && activeTools.length > 0) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <CircularProgress
          enableTrackSlot
          size={20}
          variant="determinate"
          value={activeTools[0]?.progress ?? 0}
        />
      </Box>
    );
  }
  return (
    <Tooltip title="MCP Server is up and running">
      <TaskAlt color="success" />
    </Tooltip>
  );
};

const tabDefinitions = [
  { label: "Setup", key: "setup" },
  { label: "MCP Tools", key: "tools" },
  { label: "MCP Resources", key: "resources" },
  { label: "MCP Prompts", key: "prompts" },
  { label: "Troubleshooting", key: "troubleshooting" },
];

export const Mcp = () => {
  const { data: activeTools } = useMcpServerStatus();
  const navigate = useNavigate();
  const params = useParams({ from: "/mcp/$tab" as const });

  const currentTabIndex = tabDefinitions.findIndex(t => t.key === params.tab);
  const tabIndex = currentTabIndex >= 0 ? currentTabIndex : 0;

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    navigate({ to: `/mcp/${tabDefinitions[newValue].key}` });
  };

  return (
    <Box
      sx={{
        overflow: "auto",
        p: 4,
        height: "100%",
      }}
    >
      <Stack
        sx={{
          gap: 3,
          maxWidth: "900px",
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 2,
          }}
        >
          <Typography variant="h2">AI MCP Integration</Typography>
          {activeTools && activeTools.length > 0 && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <AiMcpProgress />
            </Box>
          )}
          <HelpDialog />
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabIndex}
            onChange={handleTabChange}
            aria-label="MCP integration tabs"
          >
            {tabDefinitions.map(tab => (
              <Tab key={tab.key} label={tab.label} />
            ))}
          </Tabs>
        </Box>

        {params.tab === "setup" && <Setup />}
        {params.tab === "tools" && <McpTools />}
        {params.tab === "resources" && <McpResources />}
        {params.tab === "prompts" && <McpPrompts />}
        {params.tab === "troubleshooting" && <Troubleshooting />}
      </Stack>
    </Box>
  );
};

const McpTools = () => {
  const { data: tools, isLoading } = useAvailableTools();

  if (isLoading) {
    return (
      <Alert severity="info">
        <Typography variant="body2">
          Loading MCP Tools from MCP server...
        </Typography>
      </Alert>
    );
  }

  if (!tools || tools.length === 0) {
    return (
      <Alert severity="warning">
        <Typography variant="body2">
          No tools available from the MCP server.
        </Typography>
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      {tools.map(tool => (
        <ToolCard key={tool.command} tool={tool} />
      ))}
    </Stack>
  );
};

const ToolCard = ({
  tool: { command, description, parameters, returns, displayName },
}: {
  tool: ToolDefinition;
}) => {
  const { data: progress } = useToolProgress(command);

  // Show progress only if this specific tool is running
  const isRunning = progress?.status === "running";

  return (
    <Accordion key={command}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Stack
          sx={{
            gap: 2,
            alignItems: "center",
            flexDirection: "row",
          }}
        >
          {isRunning ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress
                size={24}
                variant="determinate"
                value={progress?.progress ?? 0}
              />
              <Typography variant="caption" color="textSecondary">
                {progress?.progress}%
              </Typography>
            </Box>
          ) : (
            <Tooltip title="not currently running or serving requests">
              <Pause />
            </Tooltip>
          )}
          <Typography variant="h4">
            <InlineCode secondary>{command}</InlineCode>
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <Stack spacing={1}>
            <Typography variant="h4">{displayName}</Typography>
            <Typography>{description}</Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="h6">Parameters</Typography>
            {parameters.map(param => (
              <Stack key={param.name} sx={{ mb: 1 }}>
                <Stack direction="row" spacing={1}>
                  <InlineCode secondary>{param.name}</InlineCode>
                  <Typography color="textSecondary">
                    {param.optional
                      ? `optional, default: ${param.default}`
                      : "required"}
                  </Typography>
                </Stack>

                <Typography>{param.description}</Typography>
              </Stack>
            ))}
          </Stack>

          <Stack spacing={1}>
            <Typography variant="h6">Returns</Typography>
            <Code value={returns} />
          </Stack>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

const HelpDialog = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton title="what's this?" onClick={() => setOpen(true)}>
        <Help />
      </IconButton>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>What is MCP?</DialogTitle>
        <DialogContent>
          <Typography>
            TypeSlayer now supports the{" "}
            <Link
              href="https://modelcontextprotocol.io"
              target="_blank"
              rel="noopener"
            >
              Model Context Protocol (MCP)
            </Link>
            , allowing AI agents like Claude Code and Cursor to analyze and fix
            TypeScript type performance issues automatically.
          </Typography>
          <br />
          <Typography>
            The Model Context Protocol is an open standard that connects AI
            applications to external systems. Think of it like USB-C for AI - it
            provides a standardized way for AI agents to access tools, data
            sources, and workflows.
          </Typography>
          <br />
          <Typography>
            TypeSlayer's MCP integration exposes type analysis capabilities as
            tools that AI agents can invoke to:
          </Typography>
          <Box component="ul" sx={{ pl: 3 }}>
            <li>
              <Typography>
                Identify performance hotspots in TypeScript compilation
              </Typography>
            </li>
            <li>
              <Typography>
                Understand which types are causing slowdowns
              </Typography>
            </li>
            <li>
              <Typography>
                Get recommendations for optimizing type definitions
              </Typography>
            </li>
            <li>
              <Typography>Apply automated fixes (coming soon)</Typography>
            </li>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

const defaultMcpJson = {
  servers: {
    TypeSlayer: {
      command: "typeslayer",
      args: ["mcp"],
    },
  },
};

export const McpResources = () => {
  return (
    <Stack spacing={2}>
      <Typography>MCP Resources - coming soon</Typography>
    </Stack>
  );
};

const McpPrompts = () => {
  return (
    <Stack spacing={2}>
      <Typography>
        Here's how you might use TypeSlayer with an AI agent to diagnose and fix
        type performance issues:
      </Typography>

      <Box
        component="ol"
        sx={{
          pl: 3,
          "& li": { mb: 2 },
        }}
      >
        <li>
          <Typography>
            <strong>Run trace analysis</strong> in TypeSlayer GUI to generate
            performance data
          </Typography>
        </li>
        <li>
          <Typography>
            <strong>Ask your AI agent:</strong> "Can you use TypeSlayer to
            identify the types causing the most compilation slowdown?"
          </Typography>
        </li>
        <li>
          <Typography>
            <strong>The agent calls</strong>{" "}
            <InlineCode>get_hotspots</InlineCode> and reports findings
          </Typography>
        </li>
        <li>
          <Typography>
            <strong>You ask for details:</strong> "Can you explain why
            Promise&lt;User[]&gt; is taking so long?"
          </Typography>
        </li>
        <li>
          <Typography>
            <strong>The agent provides</strong> analysis based on type
            complexity and usage patterns
          </Typography>
        </li>
        <li>
          <Typography>
            <strong>Future:</strong> Agent suggests and applies fixes
            automatically
          </Typography>
        </li>
      </Box>
    </Stack>
  );
};

const Setup = () => {
  return (
    <Stack spacing={2}>
      <Alert severity="warning">
        <Typography variant="body2">
          Run a trace in the TypeSlayer GUI first; the MCP tools read that data.
        </Typography>
      </Alert>

      <Typography>
        Put this into your <InlineCode>mcp.json</InlineCode> (or the MCP config
        file your client uses). No extra environment variables are required.
      </Typography>

      <Box sx={{ maxWidth: 400 }}>
        <Code value={defaultMcpJson} fileName="mcp.json" />
      </Box>

      <Typography variant="h4" gutterBottom>
        Quick setup (all providers)
      </Typography>
      <Box component="ol" sx={{ pl: 3, mb: 2, "& li": { mb: 1.5 } }}>
        <li>
          <Typography>
            Ensure the <InlineCode>typeslayer</InlineCode> binary is on your
            <InlineCode> PATH</InlineCode> (or reference it with an absolute
            path in <InlineCode>mcp.json</InlineCode>).
          </Typography>
        </li>
        <li>
          <Typography>
            Save the above <InlineCode>mcp.json</InlineCode> where your MCP
            client expects it (see provider links below for locations).
          </Typography>
        </li>
        <li>
          <Typography>Restart or reload your MCP client.</Typography>
        </li>
        <li>
          <Typography>
            Ask your AI to call <InlineCode>get_hotspots</InlineCode> (for
            example, "find hotspots over 500ms").
          </Typography>
        </li>
      </Box>

      <Typography variant="h4" gutterBottom>
        Provider reference links
      </Typography>
      <Box component="ul" sx={{ pl: 3, mb: 1.5 }}>
        <li>
          <Typography>
            Claude Desktop / Claude Code:{" "}
            <Link
              href="https://docs.anthropic.com/claude/docs/model-context-protocol"
              target="_blank"
              rel="noopener"
            >
              MCP setup guide
            </Link>
          </Typography>
        </li>
        <li>
          <Typography>
            VS Code + GitHub Copilot:{" "}
            <Link
              href="https://code.visualstudio.com/docs/copilot/customization/mcp-servers"
              target="_blank"
              rel="noopener"
            >
              MCP servers documentation
            </Link>
          </Typography>
        </li>
        <li>
          <Typography>
            Cursor:{" "}
            <Link
              href="https://docs.cursor.com/advanced/model-context-protocol"
              target="_blank"
              rel="noopener"
            >
              MCP configuration
            </Link>
          </Typography>
        </li>
        <li>
          <Typography>
            Neovim (avante.nvim):{" "}
            <Link
              href="https://github.com/yetone/avante.nvim#model-context-protocol"
              target="_blank"
              rel="noopener"
            >
              MCP setup
            </Link>
          </Typography>
        </li>
      </Box>
    </Stack>
  );
};

const Troubleshooting = () => {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" gutterBottom>
          "No analyze-trace data available"
        </Typography>
        <Typography>
          Run the trace analysis in the TypeSlayer GUI first. The MCP server
          reads from the same data directory that the GUI writes to.
        </Typography>
      </Box>

      <Box>
        <Typography variant="h6" gutterBottom>
          "Command not found: typeslayer-mcp"
        </Typography>
        <Typography>
          Make sure TypeSlayer is installed and the binary is in your PATH. You
          may need to use the full path to the executable in your MCP
          configuration.
        </Typography>
      </Box>

      <Box>
        <Typography variant="h6" gutterBottom>
          Server not appearing in Claude
        </Typography>
        <Typography>
          Check the Claude Desktop logs for errors. Make sure your configuration
          file is valid JSON and properly formatted.
        </Typography>
      </Box>
      <Box component="ul" sx={{ pl: 3 }}>
        <li>
          <Typography>
            <Link
              href="https://modelcontextprotocol.io"
              target="_blank"
              rel="noopener"
            >
              Model Context Protocol Documentation
            </Link>
          </Typography>
        </li>
        <li>
          <Typography>
            <Link
              href="https://github.com/dimitropoulos/typeslayer"
              target="_blank"
              rel="noopener"
            >
              TypeSlayer GitHub Repository
            </Link>
          </Typography>
        </li>
        <li>
          <Typography>
            <Link
              href="https://www.anthropic.com/claude"
              target="_blank"
              rel="noopener"
            >
              Claude Desktop
            </Link>
          </Typography>
        </li>
      </Box>
    </Stack>
  );
};
