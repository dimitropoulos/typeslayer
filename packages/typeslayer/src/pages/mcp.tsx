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
import { type SyntheticEvent, useState } from "react";
import { Code } from "../components/code";
import { InlineCode } from "../components/inline-code";
import { TabLabel } from "../components/tab-label";
import { createOpenHandler } from "../components/utils";
import {
  type ManagedResource,
  type ToolDefinition,
  useAvailableResources,
  useAvailableTools,
  useMcpToolStatus,
} from "../hooks/tauri-hooks";

export const AiMcpProgress = ({ variant }: { variant: "button" | "icon" }) => {
  const { data: activeTools } = useMcpToolStatus();

  switch (variant) {
    case "button":
      if (activeTools && activeTools.length === 0) {
        return <CircularProgress enableTrackSlot size={20} />;
      }
      return (
        <Stack
          sx={{
            flexDirection: "row",
            alignItems: "center",
            gap: 1,
          }}
        >
          <TaskAlt color="success" sx={{ verticalAlign: "middle" }} />
          <Typography color="success">
            the TypeSlayer MCP Server is up and running
          </Typography>
        </Stack>
      );

    case "icon":
      if (activeTools && activeTools.length === 0) {
        return <CircularProgress enableTrackSlot size={20} />;
      }

      return (
        <Tooltip title="MCP Server is up and running">
          <TaskAlt color="success" />
        </Tooltip>
      );
  }
};

const tabDefinitions = [
  { label: "Setup", key: "setup" },
  { label: "MCP Tools", key: "tools" },
  { label: "MCP Resources", key: "resources" },
  { label: "MCP Prompts", key: "prompts" },
  { label: "Troubleshooting", key: "troubleshooting" },
];

export const Mcp = () => {
  const navigate = useNavigate();
  const params = useParams({ from: "/mcp/$tab" as const });
  const { data: tools } = useAvailableTools();
  const { data: resources } = useAvailableResources();

  const currentTabIndex = tabDefinitions.findIndex(t => t.key === params.tab);
  const tabIndex = currentTabIndex >= 0 ? currentTabIndex : 0;

  const handleTabChange = (_event: SyntheticEvent, newValue: number) => {
    navigate({ to: `/mcp/${tabDefinitions[newValue].key}` });
  };

  const getTabCount = (tabKey: string) => {
    switch (tabKey) {
      case "tools":
        return tools?.length ?? 0;
      case "resources":
        return resources?.length ?? 0;
      default:
        return null;
    }
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
          gap: 1,
          maxWidth: "900px",
        }}
      >
        <Stack
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "flex-start",
          }}
        >
          <Stack sx={{ display: "flex", flexDirection: "row", gap: 1 }}>
            <Typography variant="h2">AI MCP Integration</Typography>
            <HelpDialog />
          </Stack>
          <AiMcpProgress variant="button" />
        </Stack>

        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          aria-label="MCP integration tabs"
          sx={{ borderBottom: 1, borderColor: "divider", marginBottom: 1 }}
        >
          {tabDefinitions.map(tab => {
            const count = getTabCount(tab.key);
            return (
              <Tab
                key={tab.key}
                label={<TabLabel label={tab.label} count={count} />}
              />
            );
          })}
        </Tabs>

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
    <Stack gap={2}>
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
  const { data: progress } = useMcpToolStatus();

  // Show progress only if this specific tool is running
  const isRunning = progress?.some(t => t.command === command);

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
            <CircularProgress size={24} />
          ) : (
            <Tooltip title="not currently running or serving requests">
              <Pause />
            </Tooltip>
          )}
          <Typography variant="h4">
            <InlineCode>{command}</InlineCode>
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack gap={2}>
          <Stack gap={1}>
            <Typography variant="h4">{displayName}</Typography>
            <Typography>{description}</Typography>
          </Stack>

          <Stack gap={1}>
            <Typography variant="h6">Parameters</Typography>
            {parameters.map(param => (
              <Stack key={param.name} sx={{ mb: 1 }}>
                <Stack direction="row" gap={1}>
                  <InlineCode>{param.name}</InlineCode>
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

          <Stack gap={1}>
            <Typography variant="h6">Returns</Typography>
            <Code value={JSON.stringify(returns, null, 2)} />
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
              onClick={createOpenHandler("https://modelcontextprotocol.io")}
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
      command: "npx",
      args: ["typeslayer", "mcp"],
    },
  },
};

export const McpResources = () => {
  const { data: resources, isLoading } = useAvailableResources();

  if (isLoading) {
    return (
      <Alert severity="info">
        <Typography variant="body2">
          Loading MCP Resources from MCP server...
        </Typography>
      </Alert>
    );
  }

  if (!resources || resources.length === 0) {
    return (
      <Alert severity="warning">
        <Typography variant="body2">
          No resources available from the MCP server.
        </Typography>
      </Alert>
    );
  }

  return (
    <Stack gap={2}>
      {resources.map(resource => (
        <ResourceCard key={resource.uri} resource={resource} />
      ))}
    </Stack>
  );
};

const ResourceCard = ({ resource }: { resource: ManagedResource }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleExpand = async () => {
    if (!isExpanded && !content) {
      setIsLoading(true);
      setError(null);
      try {
        // For now, we'll display a message that resources can be read via MCP
        // The actual content would be fetched through the MCP interface
        setContent(
          `Resource URI: ${resource.uri}\nMIME Type: ${resource.mimeType || "unknown"}\n\nThis resource can be read via the MCP protocol. Content access coming soon via UI.`,
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load resource",
        );
      } finally {
        setIsLoading(false);
      }
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <Accordion expanded={isExpanded} onChange={handleToggleExpand}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Stack
          sx={{
            gap: 2,
            alignItems: "center",
            flexDirection: "row",
          }}
        >
          <Typography variant="h4">
            <InlineCode>{resource.name}</InlineCode>
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack gap={2}>
          <Stack gap={1}>
            <Typography variant="h6">Details</Typography>
            {resource.description && (
              <Typography>{resource.description}</Typography>
            )}
            <Stack direction="row" gap={1}>
              <Typography variant="body2" color="textSecondary">
                URI:
              </Typography>
              <InlineCode>{resource.uri}</InlineCode>
            </Stack>
            <Stack direction="row" gap={1}>
              <Typography variant="body2" color="textSecondary">
                MIME Type:
              </Typography>
              <InlineCode>{resource.mimeType || "unknown"}</InlineCode>
            </Stack>
          </Stack>

          {isLoading && <CircularProgress />}
          {error && (
            <Alert severity="error">
              <Typography variant="body2">{error}</Typography>
            </Alert>
          )}
          {content && !isLoading && (
            <Stack gap={1}>
              <Typography variant="h6">Content</Typography>
              <Code value={content} />
            </Stack>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

const McpPrompts = () => {
  return (
    <Stack gap={2}>
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

const providerLinks = [
  {
    name: "Claude Desktop / Claude Code",
    url: "https://code.claude.com/docs/en/mcp",
  },
  {
    name: "VS Code + GitHub Copilot",
    url: "https://code.visualstudio.com/docs/copilot/customization/mcp-servers",
  },
  {
    name: "Cursor",
    url: "https://cursor.com/docs/context/mcp",
  },
  {
    name: "Neovim (avante.nvim)",
    url: "https://github.com/yetone/avante.nvim#model-context-protocol",
  },
];

const Setup = () => {
  return (
    <Stack gap={2}>
      <Typography variant="h4" gutterBottom>
        Quick Setup
      </Typography>

      <Box component="ol" sx={{ pl: 3, mb: 2, "& li": { mb: 1.5 } }}>
        <li>
          <Typography>
            use TypeSlayer's <Link href="/start">Start | Run Diagnostics</Link>{" "}
            module to generate the data that the MCP Server relies on
          </Typography>
        </li>
        <li>
          <Stack sx={{ gap: 1, alignItems: "flex-start" }}>
            <Typography>
              use this <InlineCode>mcp.json</InlineCode> where your MCP client
              expects it
            </Typography>

            <ul style={{ marginLeft: "-24px" }}>
              {providerLinks.map(({ name, url }) => (
                <li key={name} style={{ marginBottom: "0px" }}>
                  <Link href={url} onClick={createOpenHandler(url)}>
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
            <Box sx={{ py: 1 }}>
              <Code
                value={JSON.stringify(defaultMcpJson, null, 2)}
                fileName="mcp.json"
              />
            </Box>
          </Stack>
        </li>
        <li>
          <Typography>restart or reload your MCP clien.</Typography>
        </li>
        <li>
          <Typography>
            ask your AI to call use TypeSlayer tools to analyze your TypeScript
            (prompt examples <Link href="/mcp/prompts">here</Link>)
          </Typography>
        </li>
      </Box>
    </Stack>
  );
};

const Troubleshooting = () => {
  return (
    <Stack gap={3}>
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
              onClick={createOpenHandler("https://modelcontextprotocol.io")}
            >
              Model Context Protocol Documentation
            </Link>
          </Typography>
        </li>
        <li>
          <Typography>
            <Link
              href="https://github.com/dimitropoulos/typeslayer"
              onClick={createOpenHandler(
                "https://github.com/dimitropoulos/typeslayer",
              )}
            >
              TypeSlayer GitHub Repository
            </Link>
          </Typography>
        </li>
        <li>
          <Typography>
            <Link
              href="https://www.anthropic.com/claude"
              onClick={createOpenHandler("https://www.anthropic.com/claude")}
            >
              Claude Desktop
            </Link>
          </Typography>
        </li>
      </Box>
    </Stack>
  );
};
