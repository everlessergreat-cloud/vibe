declare module '@novnc/novnc/lib/rfb.js' {
	interface RFBCredentials {
		password?: string;
		username?: string;
		target?: string;
	}

	interface RFBOptions {
		shared?: boolean;
		credentials?: RFBCredentials;
		repeaterID?: string;
		wsProtocols?: string[];
	}

	interface RFBDisplay {
		_target: HTMLCanvasElement;
	}

	class RFB extends EventTarget {
		constructor(
			target: HTMLElement,
			urlOrChannel: string | WebSocket,
			options?: RFBOptions,
		);

		// Properties
		viewOnly: boolean;
		focusOnClick: boolean;
		clipViewport: boolean;
		dragViewport: boolean;
		scaleViewport: boolean;
		resizeSession: boolean;
		showDotCursor: boolean;
		background: string;
		qualityLevel: number;
		compressionLevel: number;

		// Internal display reference
		_display: RFBDisplay;

		// Methods
		disconnect(): void;
		sendCredentials(credentials: RFBCredentials): void;
		sendKey(keysym: number, code: string | null, down?: boolean): void;
		sendCtrlAltDel(): void;
		focus(options?: FocusOptions): void;
		blur(): void;
		machineShutdown(): void;
		machineReboot(): void;
		machineReset(): void;
		clipboardPasteFrom(text: string): void;

		// Events
		addEventListener(
			type: 'connect',
			listener: (e: Event) => void,
		): void;
		addEventListener(
			type: 'disconnect',
			listener: (e: CustomEvent<{ clean: boolean }>) => void,
		): void;
		addEventListener(
			type: 'credentialsrequired',
			listener: (e: Event) => void,
		): void;
		addEventListener(
			type: 'securityfailure',
			listener: (
				e: CustomEvent<{ status: number; reason: string }>,
			) => void,
		): void;
		addEventListener(
			type: 'clipboard',
			listener: (e: CustomEvent<{ text: string }>) => void,
		): void;
		addEventListener(
			type: 'bell',
			listener: (e: Event) => void,
		): void;
		addEventListener(
			type: 'desktopname',
			listener: (e: CustomEvent<{ name: string }>) => void,
		): void;
		addEventListener(
			type: 'desktopsize',
			listener: (
				e: CustomEvent<{ width: number; height: number }>,
			) => void,
		): void;
	}

	export default RFB;
}
