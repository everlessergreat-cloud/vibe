import { useCallback, useEffect, useRef, useState } from 'react';
import RFB from '@novnc/novnc/lib/rfb.js';
import type {
	VncConnectionConfig,
	VncConnectionState,
} from '../types';

interface UseVncConnectionOptions {
	onClipboard?: (text: string) => void;
	onBell?: () => void;
}

interface UseVncConnectionReturn {
	state: VncConnectionState;
	rfbRef: React.MutableRefObject<RFB | null>;
	connect: (target: HTMLElement, config: VncConnectionConfig) => void;
	disconnect: () => void;
	sendKey: (keysym: number, code: string, down?: boolean) => void;
	sendClipboard: (text: string) => void;
	machineShutdown: () => void;
	machineReboot: () => void;
	focusCanvas: () => void;
}

export function useVncConnection(
	options: UseVncConnectionOptions = {},
): UseVncConnectionReturn {
	const rfbRef = useRef<RFB | null>(null);
	const [state, setState] = useState<VncConnectionState>({
		status: 'disconnected',
		error: null,
		serverName: null,
		desktopSize: null,
	});

	const cleanup = useCallback(() => {
		if (rfbRef.current) {
			try {
				rfbRef.current.disconnect();
			} catch {
				// Already disconnected
			}
			rfbRef.current = null;
		}
	}, []);

	useEffect(() => {
		return cleanup;
	}, [cleanup]);

	const connect = useCallback(
		(target: HTMLElement, config: VncConnectionConfig) => {
			cleanup();

			setState({
				status: 'connecting',
				error: null,
				serverName: null,
				desktopSize: null,
			});

			const protocol = config.ssl ? 'wss' : 'ws';
			const url = `${protocol}://${config.host}:${config.port}/${config.path}`;

			try {
				const rfb = new RFB(target, url, {
					credentials: config.password
						? { password: config.password }
						: undefined,
					wsProtocols: ['binary'],
				});

				rfb.scaleViewport = config.scaleViewport;
				rfb.clipViewport = config.clipToWindow;
				rfb.showDotCursor = config.showDotCursor;
				rfb.viewOnly = config.viewOnly;
				rfb.qualityLevel = config.qualityLevel;
				rfb.compressionLevel = config.compressionLevel;
				rfb.resizeSession = false;

				rfb.addEventListener(
					'connect',
					() => {
						setState((prev) => ({
							...prev,
							status: 'connected',
							error: null,
						}));
					},
				);

				rfb.addEventListener(
					'disconnect',
					(e: CustomEvent<{ clean: boolean }>) => {
						const clean = e.detail.clean;
						setState((prev) => ({
							...prev,
							status: 'disconnected',
							error: clean
								? null
								: 'Connection lost unexpectedly',
							serverName: null,
							desktopSize: null,
						}));
						rfbRef.current = null;
					},
				);

				rfb.addEventListener(
					'credentialsrequired',
					() => {
						setState((prev) => ({
							...prev,
							status: 'error',
							error: 'Server requires credentials. Check your password.',
						}));
					},
				);

				rfb.addEventListener(
					'securityfailure',
					(e: CustomEvent<{ status: number; reason: string }>) => {
						setState((prev) => ({
							...prev,
							status: 'error',
							error: `Security failure: ${e.detail.reason || 'Authentication failed'}`,
						}));
					},
				);

				rfb.addEventListener(
					'desktopname',
					(e: CustomEvent<{ name: string }>) => {
						setState((prev) => ({
							...prev,
							serverName: e.detail.name,
						}));
					},
				);

				rfb.addEventListener(
					'desktopsize',
					(
						e: CustomEvent<{
							width: number;
							height: number;
						}>,
					) => {
						setState((prev) => ({
							...prev,
							desktopSize: {
								width: e.detail.width,
								height: e.detail.height,
							},
						}));
					},
				);

				rfb.addEventListener(
					'clipboard',
					(e: CustomEvent<{ text: string }>) => {
						options.onClipboard?.(e.detail.text);
					},
				);

				rfb.addEventListener('bell', () => {
					options.onBell?.();
				});

				rfbRef.current = rfb;
			} catch (err) {
				setState({
					status: 'error',
					error:
						err instanceof Error
							? err.message
							: 'Failed to connect',
					serverName: null,
					desktopSize: null,
				});
			}
		},
		[cleanup, options],
	);

	const disconnect = useCallback(() => {
		setState((prev) => ({ ...prev, status: 'disconnecting' }));
		cleanup();
		setState({
			status: 'disconnected',
			error: null,
			serverName: null,
			desktopSize: null,
		});
	}, [cleanup]);

	const sendKey = useCallback(
		(keysym: number, code: string, down?: boolean) => {
			if (!rfbRef.current) return;
			rfbRef.current.sendKey(keysym, code, down);
		},
		[],
	);

	const sendClipboard = useCallback((text: string) => {
		if (!rfbRef.current) return;
		rfbRef.current.clipboardPasteFrom(text);
	}, []);

	const machineShutdown = useCallback(() => {
		if (!rfbRef.current) return;
		rfbRef.current.machineShutdown();
	}, []);

	const machineReboot = useCallback(() => {
		if (!rfbRef.current) return;
		rfbRef.current.machineReboot();
	}, []);

	const focusCanvas = useCallback(() => {
		if (!rfbRef.current) return;
		rfbRef.current.focus();
	}, []);

	return {
		state,
		rfbRef,
		connect,
		disconnect,
		sendKey,
		sendClipboard,
		machineShutdown,
		machineReboot,
		focusCanvas,
	};
}
