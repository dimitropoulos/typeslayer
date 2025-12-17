import { Box, Link } from "@mui/material";
import { createOpenHandler } from "./utils";

export const UsefulLinks = ({
  showGithub = false,
}: {
  showGithub?: boolean;
}) => {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {showGithub ? (
        <Link
          href="https://github.com/dimitropoulos/typeslayer"
          onClick={createOpenHandler(
            "https://github.com/dimitropoulos/typeslayer",
          )}
        >
          TypeSlayer GitHub
        </Link>
      ) : null}
      <Link
        href="https://github.com/microsoft/Typescript/wiki/Performance"
        onClick={createOpenHandler(
          "https://github.com/microsoft/Typescript/wiki/Performance",
        )}
      >
        TypeScript's Performance Docs
      </Link>
      <Link
        href="https://github.com/microsoft/TypeScript/wiki/Performance-Tracing"
        onClick={createOpenHandler(
          "https://github.com/microsoft/TypeScript/wiki/Performance-Tracing",
        )}
      >
        TypeScript's Performance Tracing Docs
      </Link>
    </Box>
  );
};
