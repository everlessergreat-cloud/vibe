export interface VncConnectionConfig {
	host: string;
	port: number;
	password: string;
	path: string;
	ssl: boolean;
	viewOnly: boolean;
	qualityLevel: number;
	compressionLevel: number;
	scaleViewport: boolean;
	clipToWindow: boolean;
	showDotCursor: boolean;
}

export interface VncConnectionProfile {
	id: string;
	name: string;
	config: VncConnectionConfig;
	createdAt: number;
}

export type VncConnectionStatus =
	| 'disconnected'
	| 'connecting'
	| 'connected'
	| 'disconnecting'
	| 'error';

export interface VncConnectionState {
	status: VncConnectionStatus;
	error: string | null;
	serverName: string | null;
	desktopSize: { width: number; height: number } | null;
}

export const DEFAULT_VNC_CONFIG: VncConnectionConfig = {
	host: '',
	port: 5900,
	password: '',
	path: 'websockify',
	ssl: true,
	viewOnly: false,
	qualityLevel: 6,
	compressionLevel: 2,
	scaleViewport: true,
	clipToWindow: true,
	showDotCursor: false,
};

const STORAGE_KEY = 'vnc-profiles';

export function loadProfiles(): VncConnectionProfile[] {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return [];
		return JSON.parse(stored) as VncConnectionProfile[];
	} catch {
		return [];
	}
}

export function saveProfiles(profiles: VncConnectionProfile[]): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}
