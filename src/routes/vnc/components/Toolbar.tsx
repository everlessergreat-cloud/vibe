import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import {
	Keyboard,
	Clipboard,
	ClipboardPaste,
	Camera,
	Maximize,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type RFB from '@novnc/novnc/lib/rfb.js';

// Common keysyms for virtual keyboard
const KEYBOARD_KEYS = [
	{ label: 'Esc', keysym: 0xff1b, code: 'Escape' },
	{ label: 'Tab', keysym: 0xff09, code: 'Tab' },
	{ label: 'Enter', keysym: 0xff0d, code: 'Enter' },
	{ label: 'Space', keysym: 0x0020, code: 'Space' },
	{ label: 'Backspace', keysym: 0xff08, code: 'Backspace' },
	{ label: 'Delete', keysym: 0xffff, code: 'Delete' },
	{ label: 'Ctrl', keysym: 0xffe3, code: 'ControlLeft' },
	{ label: 'Alt', keysym: 0xffe9, code: 'AltLeft' },
] as const;

interface ToolbarProps {
	rfbRef: React.MutableRefObject<RFB | null>;
	connected: boolean;
	onSendKey: (keysym: number, code: string, down?: boolean) => void;
	onSendClipboard: (text: string) => void;
	onFocusCanvas: () => void;
	className?: string;
}

export function Toolbar({
	rfbRef,
	connected,
	onSendKey,
	onSendClipboard,
	onFocusCanvas,
	className,
}: ToolbarProps) {
	const [clipboardText, setClipboardText] = useState('');

	const handleScreenshot = useCallback(() => {
		if (!rfbRef.current) return;
		const canvas = rfbRef.current._display?._target;
		if (!canvas) return;
		try {
			const link = document.createElement('a');
			link.download = `vnc-screenshot-${Date.now()}.png`;
			link.href = canvas.toDataURL('image/png');
			link.click();
		} catch {
			// Canvas tainted or not available
		}
	}, [rfbRef]);

	const handlePasteClipboard = useCallback(() => {
		if (clipboardText.trim()) {
			onSendClipboard(clipboardText);
			setClipboardText('');
		}
	}, [clipboardText, onSendClipboard]);

	const handleReadClipboard = useCallback(async () => {
		try {
			const text = await navigator.clipboard.readText();
			setClipboardText(text);
		} catch {
			// Clipboard access denied
		}
	}, []);

	const handleFullscreen = useCallback(() => {
		const container = document.getElementById('vnc-canvas-container');
		if (container) {
			if (document.fullscreenElement) {
				document.exitFullscreen();
			} else {
				container.requestFullscreen();
			}
		}
	}, []);

	const pressKey = useCallback(
		(keysym: number, code: string) => {
			onSendKey(keysym, code, true);
			setTimeout(() => onSendKey(keysym, code, false), 50);
		},
		[onSendKey],
	);

	return (
		<TooltipProvider delayDuration={300}>
			<div
				className={cn(
					'flex items-center gap-1 p-2 border-b border-bg-3 bg-bg-2',
					className,
				)}
			>
				{/* Virtual Keyboard */}
				<Popover>
					<Tooltip>
						<TooltipTrigger asChild>
							<PopoverTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									disabled={!connected}
									className="h-8 w-8"
								>
									<Keyboard className="h-4 w-4" />
								</Button>
							</PopoverTrigger>
						</TooltipTrigger>
						<TooltipContent>Virtual Keyboard</TooltipContent>
					</Tooltip>
					<PopoverContent
						className="w-auto p-2"
						align="start"
					>
						<div className="flex flex-wrap gap-1 max-w-64">
							{KEYBOARD_KEYS.map((key) => (
								<Button
									key={key.code}
									variant="outline"
									size="sm"
									className="h-7 text-xs px-2"
									onClick={() => {
										pressKey(key.keysym, key.code);
										onFocusCanvas();
									}}
								>
									{key.label}
								</Button>
							))}
						</div>
						<div className="mt-2 pt-2 border-t border-bg-3">
							<p className="text-xs text-text-tertiary mb-1">
								Click the VNC screen to type directly
							</p>
						</div>
					</PopoverContent>
				</Popover>

				{/* Clipboard */}
				<Popover>
					<Tooltip>
						<TooltipTrigger asChild>
							<PopoverTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									disabled={!connected}
									className="h-8 w-8"
								>
									<Clipboard className="h-4 w-4" />
								</Button>
							</PopoverTrigger>
						</TooltipTrigger>
						<TooltipContent>Clipboard</TooltipContent>
					</Tooltip>
					<PopoverContent className="w-72 p-3" align="start">
						<div className="space-y-2">
							<p className="text-sm font-medium text-text-primary">
								Clipboard Sync
							</p>
							<Input
								placeholder="Text to send..."
								value={clipboardText}
								onChange={(e) =>
									setClipboardText(e.target.value)
								}
								className="h-8 text-sm"
							/>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={handleReadClipboard}
									className="flex-1"
								>
									<ClipboardPaste className="h-3.5 w-3.5 mr-1" />
									From local
								</Button>
								<Button
									size="sm"
									onClick={handlePasteClipboard}
									className="flex-1"
									disabled={!clipboardText.trim()}
								>
									Send to phone
								</Button>
							</div>
						</div>
					</PopoverContent>
				</Popover>

				<div className="w-px h-5 bg-bg-3 mx-1" />

				{/* Screenshot */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							onClick={handleScreenshot}
							disabled={!connected}
							className="h-8 w-8"
						>
							<Camera className="h-4 w-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Screenshot</TooltipContent>
				</Tooltip>

				{/* Fullscreen */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							onClick={handleFullscreen}
							disabled={!connected}
							className="h-8 w-8"
						>
							<Maximize className="h-4 w-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Fullscreen</TooltipContent>
				</Tooltip>
			</div>
		</TooltipProvider>
	);
}
