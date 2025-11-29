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
	onAuthenticated: () => void;
}

export const AuthGate: FC<AuthGateProps> = ({ onAuthenticated }) => {
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [checking, setChecking] = useState(true);

	// On mount, check if already authenticated via env/flag/config
	useEffect(() => {
		(async () => {
			try {
				console.log("[AuthGate] Checking is_authenticated...");
				const authenticated = await invoke<boolean>("is_authenticated");
				console.log("[AuthGate] is_authenticated result:", authenticated);
				if (authenticated) {
					console.log(
						"[AuthGate] Auto-authenticated! Calling onAuthenticated()",
					);
					onAuthenticated();
					return;
				}
				console.log("[AuthGate] Not authenticated, showing gate");
			} catch (err) {
				console.error("[AuthGate] Auth check failed:", err);
			} finally {
				setChecking(false);
			}
		})();
	}, [onAuthenticated]);

	const handleSubmit = useCallback(async () => {
		setError(null);
		try {
			const valid = await invoke<boolean>("validate_auth_code", { code });
			if (valid) {
				onAuthenticated();
			} else {
				setError("Invalid code. Please try again.");
			}
		} catch (err) {
			setError("Validation failed. Please try again.");
			console.error(err);
		}
	}, [code, onAuthenticated]);

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
					Checking authentication...
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
						Enter your authentication code to continue
					</Typography>
					<TextField
						variant="outlined"
						placeholder="Auth Code"
						fullWidth
						value={code}
						onChange={(e) => setCode(e.target.value)}
						onKeyDown={(e) => {
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
