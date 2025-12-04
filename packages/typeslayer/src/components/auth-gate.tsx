import {
  Alert,
  Box,
  Button,
  Container,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { type FC, useCallback, useEffect, useState } from "react";
import typeslayerLogo from "../assets/typeslayer.png";

interface AuthGateProps {
  onAuthorized: () => void;
}

export const AuthGate: FC<AuthGateProps> = ({ onAuthorized }) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // On mount, check if already authorized via env/flag/config
  useEffect(() => {
    (async () => {
      try {
        console.log("[AuthGate] Checking is_authorized...");
        const authorized = await invoke<boolean>("is_authorized");
        console.log("[AuthGate] is_authorized result:", authorized);
        if (authorized) {
          console.log("[AuthGate] Auto-authorized! Calling onAuthorized()");
          onAuthorized();
          return;
        }
        console.log("[AuthGate] Not authorized, showing gate");
      } catch (err) {
        console.error("[AuthGate] Auth check failed:", err);
      } finally {
        setChecking(false);
      }
    })();
  }, [onAuthorized]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    try {
      const valid = await invoke<boolean>("validate_auth_code", { code });
      if (valid) {
        onAuthorized();
      } else {
        setError("Invalid code. Please try again.");
      }
    } catch (err) {
      setError("Validation failed. Please try again.");
      console.error(err);
    }
  }, [code, onAuthorized]);

  if (checking) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "background.default",
        }}
      >
        <Typography variant="h6" color="text.secondary">
          Checking authorization...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "background.default",
      }}
    >
      <Container maxWidth="sm">
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            p: 4,
            backgroundColor: "background.paper",
            borderRadius: 2,
            boxShadow: 3,
          }}
        >
          <img
            src={typeslayerLogo}
            alt="TypeSlayer Logo"
            style={{ width: "100%", maxWidth: "200px", margin: "0 auto" }}
          />
          <Typography variant="body1" color="text.secondary" textAlign="center">
            TypeSlayer isn't quite ready for prime time yet.
          </Typography>
          <TextField
            variant="outlined"
            placeholder="enter the super secret code Dimitri gave you"
            fullWidth
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                handleSubmit();
              }
            }}
            autoFocus
            inputProps={{ maxLength: 8 }}
          />
          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={code.length !== 8}
          >
            Unlock
          </Button>
        </Box>
      </Container>
      <Snackbar
        open={!!error}
        autoHideDuration={4000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};
