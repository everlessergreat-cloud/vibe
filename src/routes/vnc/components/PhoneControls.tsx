import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import {
	Home,
	ChevronLeft,
	Square,
	Volume2,
	VolumeOff,
	Power,
	RotateCcw,
	ArrowUp,
	ArrowDown,
	ArrowLeft,
	ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Android keysyms matching X11 keysym values
const KEYSYMS = {
	HOME: 0xff50,
	ESCAPE: 0xff1b, // Back button on Android
	SUPER_L: 0xffeb, // Recent apps
	UP: 0xff52,
	DOWN: 0xff54,
	LEFT: 0xff51,
	RIGHT: 0xff53,
	RETURN: 0xff0d,
	VOLUME_UP: 0x1008ff13,
	VOLUME_DOWN: 0x1008ff11,
	VOLUME_MUTE: 0x1008ff12,
	POWER: 0x1008ff2a,
} as const;

interface PhoneControlsProps {
	onSendKey: (keysym: number, code: string, down?: boolean) => void;
	disabled: boolean;
	className?: string;
}

export function PhoneControls({
	onSendKey,
	disabled,
	className,
}: PhoneControlsProps) {
	const pressKey = useCallback(
		(keysym: number, code: string) => {
			onSendKey(keysym, code, true);
			setTimeout(() => onSendKey(keysym, code, false), 50);
		},
		[onSendKey],
	);

	return (
		<TooltipProvider delayDuration={300}>
			<div className={cn('flex flex-col gap-3 p-4', className)}>
				{/* Navigation Bar - Android style */}
				<div className="space-y-2">
					<span className="text-xs text-text-tertiary uppercase tracking-wider">
						Navigation
					</span>
					<div className="flex items-center justify-center gap-2">
						<ControlButton
							icon={<ChevronLeft className="h-5 w-5" />}
							label="Back"
							onClick={() =>
								pressKey(KEYSYMS.ESCAPE, 'Escape')
							}
							disabled={disabled}
						/>
						<ControlButton
							icon={<Home className="h-5 w-5" />}
							label="Home"
							onClick={() => pressKey(KEYSYMS.HOME, 'Home')}
							disabled={disabled}
							variant="primary"
						/>
						<ControlButton
							icon={<Square className="h-4 w-4" />}
							label="Recent Apps"
							onClick={() =>
								pressKey(KEYSYMS.SUPER_L, 'MetaLeft')
							}
							disabled={disabled}
						/>
					</div>
				</div>

				{/* D-Pad */}
				<div className="space-y-2">
					<span className="text-xs text-text-tertiary uppercase tracking-wider">
						D-Pad
					</span>
					<div className="grid grid-cols-3 gap-1 w-fit mx-auto">
						<div />
						<ControlButton
							icon={<ArrowUp className="h-4 w-4" />}
							label="Up"
							onClick={() =>
								pressKey(KEYSYMS.UP, 'ArrowUp')
							}
							disabled={disabled}
							size="sm"
						/>
						<div />
						<ControlButton
							icon={<ArrowLeft className="h-4 w-4" />}
							label="Left"
							onClick={() =>
								pressKey(KEYSYMS.LEFT, 'ArrowLeft')
							}
							disabled={disabled}
							size="sm"
						/>
						<ControlButton
							icon={
								<div className="h-2 w-2 rounded-full bg-current" />
							}
							label="OK / Enter"
							onClick={() =>
								pressKey(KEYSYMS.RETURN, 'Enter')
							}
							disabled={disabled}
							size="sm"
						/>
						<ControlButton
							icon={<ArrowRight className="h-4 w-4" />}
							label="Right"
							onClick={() =>
								pressKey(KEYSYMS.RIGHT, 'ArrowRight')
							}
							disabled={disabled}
							size="sm"
						/>
						<div />
						<ControlButton
							icon={<ArrowDown className="h-4 w-4" />}
							label="Down"
							onClick={() =>
								pressKey(KEYSYMS.DOWN, 'ArrowDown')
							}
							disabled={disabled}
							size="sm"
						/>
						<div />
					</div>
				</div>

				{/* Volume */}
				<div className="space-y-2">
					<span className="text-xs text-text-tertiary uppercase tracking-wider">
						Volume
					</span>
					<div className="flex items-center justify-center gap-2">
						<ControlButton
							icon={<VolumeOff className="h-4 w-4" />}
							label="Volume Down"
							onClick={() =>
								pressKey(
									KEYSYMS.VOLUME_DOWN,
									'AudioVolumeDown',
								)
							}
							disabled={disabled}
						/>
						<ControlButton
							icon={<Volume2 className="h-4 w-4" />}
							label="Volume Up"
							onClick={() =>
								pressKey(
									KEYSYMS.VOLUME_UP,
									'AudioVolumeUp',
								)
							}
							disabled={disabled}
						/>
						<ControlButton
							icon={<VolumeOff className="h-4 w-4" />}
							label="Mute"
							onClick={() =>
								pressKey(
									KEYSYMS.VOLUME_MUTE,
									'AudioVolumeMute',
								)
							}
							disabled={disabled}
						/>
					</div>
				</div>

				{/* Power */}
				<div className="space-y-2">
					<span className="text-xs text-text-tertiary uppercase tracking-wider">
						System
					</span>
					<div className="flex items-center justify-center gap-2">
						<ControlButton
							icon={<Power className="h-4 w-4" />}
							label="Power"
							onClick={() =>
								pressKey(KEYSYMS.POWER, 'Power')
							}
							disabled={disabled}
							variant="danger"
						/>
						<ControlButton
							icon={<RotateCcw className="h-4 w-4" />}
							label="Rotate / Lock Screen"
							onClick={() => {
								pressKey(KEYSYMS.POWER, 'Power');
							}}
							disabled={disabled}
						/>
					</div>
				</div>
			</div>
		</TooltipProvider>
	);
}

interface ControlButtonProps {
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
	disabled: boolean;
	variant?: 'default' | 'primary' | 'danger';
	size?: 'default' | 'sm';
}

function ControlButton({
	icon,
	label,
	onClick,
	disabled,
	variant = 'default',
	size = 'default',
}: ControlButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="outline"
					size="icon"
					onClick={onClick}
					disabled={disabled}
					className={cn(
						'transition-all active:scale-95',
						size === 'sm' ? 'h-9 w-9' : 'h-10 w-10',
						variant === 'primary' &&
							'border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300',
						variant === 'danger' &&
							'border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300',
					)}
				>
					{icon}
				</Button>
			</TooltipTrigger>
			<TooltipContent side="bottom" className="text-xs">
				{label}
			</TooltipContent>
		</Tooltip>
	);
}
