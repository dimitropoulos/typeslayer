import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import "./App.css";

function App() {
	const [currentPath, setCurrentPath] = useState("");

	useEffect(() => {
		// Get the current directory on startup
		invoke<string>("get_current_dir")
			.then((path) => setCurrentPath(path))
			.catch((error) =>
				console.error("Failed to get current directory:", error),
			);
	}, []);

	async function pickPackageJson() {
		try {
			const selected = await open({
				multiple: false,
				filters: [
					{
						name: "Package.json",
						extensions: ["json"],
					},
				],
			});

			if (selected && typeof selected === "string") {
				// Extract directory from the file path
				const dirPath = selected.substring(0, selected.lastIndexOf("/"));
				setCurrentPath(dirPath);
			}
		} catch (error) {
			console.error("Failed to open file picker:", error);
		}
	}

	return (
		<main className="container">
			<h1>Welcome to Tauri + React</h1>

			<div className="row">
				<a href="https://vite.dev" target="_blank" rel="noopener">
					<img src="/vite.svg" className="logo vite" alt="Vite logo" />
				</a>
				<a href="https://tauri.app" target="_blank" rel="noopener">
					<img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
				</a>
				<a href="https://react.dev" target="_blank" rel="noopener">
					<img src={reactLogo} className="logo react" alt="React logo" />
				</a>
			</div>
			<p>Click on the Tauri, Vite, and React logos to learn more.</p>

			<div
				className="row"
				style={{ flexDirection: "column", gap: "1rem", marginTop: "2rem" }}
			>
				<div>
					<strong>Current Directory:</strong>
					<p style={{ wordBreak: "break-all", margin: "0.5rem 0" }}>
						{currentPath || "Loading..."}
					</p>
				</div>
				<button type="button" onClick={pickPackageJson}>
					Pick package.json
				</button>
			</div>
		</main>
	);
}

export default App;
