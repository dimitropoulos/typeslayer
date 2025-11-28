declare module "@tauri-apps/plugin-upload" {
	export interface DownloadProgress {
		progress: number;
		total: number;
	}
	export function download(
		url: string,
		destination: string,
		progressCb?: (p: DownloadProgress) => void,
		headers?: Record<string, string>,
	): Promise<void>;
}
