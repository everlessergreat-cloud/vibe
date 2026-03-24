import { useEffect, useRef, useCallback, useState } from 'react';
import type RFB from '@novnc/novnc/lib/rfb.js';
import { cn } from '@/lib/utils';
import type { VncConnectionState } from '../types';
import {
	Loader2,
	MonitorOff,
	AlertTriangle,
	Maximize,
	Minimize,
	RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VncViewerProps {
	rfbRef: React.MutableRefObject<RFB | null>;
	connectionState: VncConnectionState;
	onReconnect?: () => void;
	className?: string;
}

export function VncViewer({
	rfbRef,
	connectionState,
	onReconnect,
	className,
}: VncViewerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [isFullscreen, setIsFullscreen] = useState(false);

	const toggleFullscreen = useCallback(() => {
		if (!containerRef.current) return;
		if (document.fullscreenElement) {
			document.exitFullscreen();
		} else {
			containerRef.current.requestFullscreen();
		}
	}, []);

	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement);
			if (rfbRef.current) {
				rfbRef.current.scaleViewport = true;
			}
		};
		document.addEventListener('fullscreenchange', handleFullscreenChange);
		return () => {
			document.removeEventListener(
				'fullscreenchange',
				handleFullscreenChange,
			);
		};
	}, [rfbRef]);

	const { status, error, desktopSize } = connectionState;

	return (
		<div
			ref={containerRef}
			className={cn(
				'relative flex flex-col items-center justify-center bg-black rounded-lg overflow-hidden',
				isFullscreen ? 'w-screen h-screen' : 'w-full h-full',
				className,
			)}
		>
			{/* Fullscreen toggle */}
			{status === 'connected' && (
				<div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
					<Button
						variant="ghost"
						size="icon"
						onClick={toggleFullscreen}
						className="bg-black/50 text-white hover:bg-black/70 hover:text-white h-8 w-8"
					>
						{isFullscreen ? (
							<Minimize className="h-4 w-4" />
						) : (
							<Maximize className="h-4 w-4" />
						)}
					</Button>
				</div>
			)}

			{/* Desktop size indicator */}
			{status === 'connected' && desktopSize && (
				<div className="absolute bottom-2 left-2 z-20 text-xs text-white/40 select-none pointer-events-none">
					{desktopSize.width} x {desktopSize.height}
				</div>
			)}

			{/* Status overlays */}
			{status === 'disconnected' && (
				<div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-2 z-10 gap-4">
					<MonitorOff className="h-16 w-16 text-text-tertiary" />
					<p className="text-text-secondary text-sm">
						Not connected
					</p>
					<p className="text-text-tertiary text-xs max-w-64 text-center">
						Configure your VNC connection and click Connect to start
						controlling your phone.
					</p>
				</div>
			)}

			{status === 'connecting' && (
				<div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-2 z-10 gap-3">
					<Loader2 className="h-10 w-10 text-text-secondary animate-spin" />
					<p className="text-text-secondary text-sm">Connecting...</p>
				</div>
			)}

			{status === 'disconnecting' && (
				<div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-2 z-10 gap-3">
					<Loader2 className="h-10 w-10 text-text-secondary animate-spin" />
					<p className="text-text-secondary text-sm">
						Disconnecting...
					</p>
				</div>
			)}

			{status === 'error' && (
				<div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-2 z-10 gap-3">
					<AlertTriangle className="h-12 w-12 text-destructive" />
					<p className="text-destructive text-sm font-medium">
						Connection Error
					</p>
					<p className="text-text-tertiary text-xs max-w-72 text-center">
						{error}
					</p>
					{onReconnect && (
						<Button
							variant="outline"
							size="sm"
							onClick={onReconnect}
							className="mt-2"
						>
							<RotateCcw className="h-3.5 w-3.5 mr-1.5" />
							Retry
						</Button>
					)}
				</div>
			)}
		</div>
	);
}

export function getVncCanvasContainer(): string {
	return 'vnc-canvas-container';
}
