import { useState, useCallback, useRef, useEffect } from 'react';
import { useVncConnection } from './hooks/use-vnc-connection';
import { VncViewer } from './components/VncViewer';
import { ConnectionPanel } from './components/ConnectionPanel';
import { PhoneControls } from './components/PhoneControls';
import { Toolbar } from './components/Toolbar';
import { DEFAULT_VNC_CONFIG } from './types';
import type { VncConnectionConfig } from './types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
	PanelLeftClose,
	PanelLeftOpen,
	Smartphone,
	Wifi,
	WifiOff,
	Signal,
} from 'lucide-react';
import { toast } from 'sonner';

const LAST_CONFIG_KEY = 'vnc-last-config';

function loadLastConfig(): VncConnectionConfig {
	try {
		const stored = localStorage.getItem(LAST_CONFIG_KEY);
		if (stored) return JSON.parse(stored) as VncConnectionConfig;
	} catch {
		// ignore
	}
	return { ...DEFAULT_VNC_CONFIG };
}

function saveLastConfig(config: VncConnectionConfig): void {
	localStorage.setItem(LAST_CONFIG_KEY, JSON.stringify(config));
}

export default function VncControl() {
	const [config, setConfig] = useState<VncConnectionConfig>(loadLastConfig);
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [activeTab, setActiveTab] = useState<'connection' | 'controls'>(
		'connection',
	);
	const canvasContainerRef = useRef<HTMLDivElement>(null);

	const handleClipboard = useCallback((text: string) => {
		navigator.clipboard.writeText(text).then(
			() => toast.success('Copied to clipboard'),
			() => toast.error('Failed to copy'),
		);
	}, []);

	const { state, rfbRef, connect, disconnect, sendKey, sendClipboard, focusCanvas } =
		useVncConnection({
			onClipboard: handleClipboard,
			onBell: () => toast.info('Bell'),
		});

	const handleConfigChange = useCallback((newConfig: VncConnectionConfig) => {
		setConfig(newConfig);
		saveLastConfig(newConfig);
	}, []);

	const handleConnect = useCallback(() => {
		if (!canvasContainerRef.current) return;
		connect(canvasContainerRef.current, config);
		setActiveTab('controls');
	}, [connect, config]);

	const handleDisconnect = useCallback(() => {
		disconnect();
		setActiveTab('connection');
	}, [disconnect]);

	const handleReconnect = useCallback(() => {
		if (!canvasContainerRef.current) return;
		connect(canvasContainerRef.current, config);
	}, [connect, config]);

	// Auto-switch to controls tab when connected
	useEffect(() => {
		if (state.status === 'connected') {
			setActiveTab('controls');
		}
	}, [state.status]);

	const isConnected = state.status === 'connected';

	return (
		<div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
			{/* Sidebar */}
			<div
				className={cn(
					'flex-shrink-0 border-r border-bg-3 bg-bg-2 transition-all duration-200 overflow-hidden',
					sidebarOpen ? 'w-72' : 'w-0',
				)}
			>
				<div className="w-72 h-full flex flex-col">
					{/* Sidebar Header */}
					<div className="flex items-center justify-between p-3 border-b border-bg-3">
						<div className="flex items-center gap-2">
							<Smartphone className="h-4 w-4 text-text-secondary" />
							<span className="text-sm font-medium text-text-primary">
								Phone Control
							</span>
						</div>
						<StatusIndicator status={state.status} />
					</div>

					{/* Tabs */}
					<div className="flex border-b border-bg-3">
						<button
							className={cn(
								'flex-1 py-2 text-xs font-medium transition-colors',
								activeTab === 'connection'
									? 'text-text-primary border-b-2 border-text-primary'
									: 'text-text-tertiary hover:text-text-secondary',
							)}
							onClick={() => setActiveTab('connection')}
						>
							Connection
						</button>
						<button
							className={cn(
								'flex-1 py-2 text-xs font-medium transition-colors',
								activeTab === 'controls'
									? 'text-text-primary border-b-2 border-text-primary'
									: 'text-text-tertiary hover:text-text-secondary',
							)}
							onClick={() => setActiveTab('controls')}
						>
							Controls
						</button>
					</div>

					{/* Tab Content */}
					<ScrollArea className="flex-1">
						{activeTab === 'connection' ? (
							<ConnectionPanel
								config={config}
								onConfigChange={handleConfigChange}
								status={state.status}
								onConnect={handleConnect}
								onDisconnect={handleDisconnect}
							/>
						) : (
							<PhoneControls
								onSendKey={sendKey}
								disabled={!isConnected}
							/>
						)}
					</ScrollArea>

					{/* Server info */}
					{isConnected && state.serverName && (
						<div className="p-3 border-t border-bg-3 text-xs text-text-tertiary">
							<p>
								Server:{' '}
								<span className="text-text-secondary">
									{state.serverName}
								</span>
							</p>
							{state.desktopSize && (
								<p>
									Resolution:{' '}
									<span className="text-text-secondary">
										{state.desktopSize.width} x{' '}
										{state.desktopSize.height}
									</span>
								</p>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 flex flex-col min-w-0">
				{/* Top bar */}
				<div className="flex items-center justify-between border-b border-bg-3 bg-bg-2">
					<div className="flex items-center">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setSidebarOpen(!sidebarOpen)}
							className="h-8 w-8 m-1"
						>
							{sidebarOpen ? (
								<PanelLeftClose className="h-4 w-4" />
							) : (
								<PanelLeftOpen className="h-4 w-4" />
							)}
						</Button>

						{isConnected && (
							<Toolbar
								rfbRef={rfbRef}
								connected={isConnected}
								onSendKey={sendKey}
								onSendClipboard={sendClipboard}
								onFocusCanvas={focusCanvas}
							/>
						)}
					</div>

					{isConnected && (
						<div className="flex items-center gap-2 pr-3 text-xs text-text-tertiary">
							<Signal className="h-3 w-3 text-green-500" />
							<span>
								{config.host}:{config.port}
							</span>
						</div>
					)}
				</div>

				{/* VNC Canvas */}
				<div className="flex-1 relative bg-black">
					<div
						id="vnc-canvas-container"
						ref={canvasContainerRef}
						className="absolute inset-0"
					>
						<VncViewer
							rfbRef={rfbRef}
							connectionState={state}
							onReconnect={handleReconnect}
							className="h-full"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

function StatusIndicator({
	status,
}: {
	status: string;
}) {
	switch (status) {
		case 'connected':
			return (
				<div className="flex items-center gap-1.5 text-xs text-green-500">
					<Wifi className="h-3 w-3" />
					<span>Connected</span>
				</div>
			);
		case 'connecting':
			return (
				<div className="flex items-center gap-1.5 text-xs text-yellow-500">
					<Wifi className="h-3 w-3 animate-pulse" />
					<span>Connecting</span>
				</div>
			);
		case 'error':
			return (
				<div className="flex items-center gap-1.5 text-xs text-red-500">
					<WifiOff className="h-3 w-3" />
					<span>Error</span>
				</div>
			);
		default:
			return (
				<div className="flex items-center gap-1.5 text-xs text-text-tertiary">
					<WifiOff className="h-3 w-3" />
					<span>Offline</span>
				</div>
			);
	}
}
