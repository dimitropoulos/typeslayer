import { Box, Button, Container, TextField, Typography } from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { type FC, useCallback, useEffect, useState } from "react";
import typeslayerLogo from "../assets/typeslayer.png";
import { useToast } from "../contexts/toast-context";

interface AuthGateProps {
  onAuthorized: () => void;
}

export const AuthGate: FC<AuthGateProps> = ({ onAuthorized }) => {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(true);
  const { showToast } = useToast();

  // On mount, check if already authorized via env/flag/config
  useEffect(() => {
    (async () => {
      try {
        const authorized = await invoke<boolean>("is_authorized");
        if (authorized) {
          onAuthorized();
          return;
        }
      } catch (err) {
        console.error("[AuthGate] Auth check failed:", err);
      } finally {
        setChecking(false);
      }
    })();
  }, [onAuthorized]);

  const handleSubmit = useCallback(async () => {
    try {
      const valid = await invoke<boolean>("validate_auth_code", { code });
      if (valid) {
        onAuthorized();
      } else {
        showToast({
          message: "Invalid code. Please try again.",
          severity: "error",
        });
      }
    } catch (err) {
      showToast({
        message: "Validation failed. Please try again.",
        severity: "error",
      });
      console.error(err);
    }
  }, [code, onAuthorized, showToast]);

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
    </Box>
  );
};
