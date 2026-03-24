import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Plug,
	Unplug,
	Save,
	Trash2,
	ChevronDown,
	ChevronUp,
	Eye,
	EyeOff,
} from 'lucide-react';
import type {
	VncConnectionConfig,
	VncConnectionProfile,
	VncConnectionStatus,
} from '../types';
import {
	DEFAULT_VNC_CONFIG,
	loadProfiles,
	saveProfiles,
} from '../types';
import { cn } from '@/lib/utils';

interface ConnectionPanelProps {
	config: VncConnectionConfig;
	onConfigChange: (config: VncConnectionConfig) => void;
	status: VncConnectionStatus;
	onConnect: () => void;
	onDisconnect: () => void;
}

export function ConnectionPanel({
	config,
	onConfigChange,
	status,
	onConnect,
	onDisconnect,
}: ConnectionPanelProps) {
	const [profiles, setProfiles] = useState<VncConnectionProfile[]>(
		loadProfiles,
	);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [profileName, setProfileName] = useState('');

	const isConnected = status === 'connected';
	const isConnecting = status === 'connecting';
	const isDisabled = isConnected || isConnecting;

	const updateConfig = useCallback(
		(partial: Partial<VncConnectionConfig>) => {
			onConfigChange({ ...config, ...partial });
		},
		[config, onConfigChange],
	);

	const handleSaveProfile = useCallback(() => {
		const name = profileName.trim() || `${config.host}:${config.port}`;
		const profile: VncConnectionProfile = {
			id: crypto.randomUUID(),
			name,
			config: { ...config },
			createdAt: Date.now(),
		};
		const updated = [...profiles, profile];
		setProfiles(updated);
		saveProfiles(updated);
		setProfileName('');
	}, [config, profiles, profileName]);

	const handleLoadProfile = useCallback(
		(id: string) => {
			const profile = profiles.find((p) => p.id === id);
			if (profile) {
				onConfigChange({ ...profile.config });
			}
		},
		[profiles, onConfigChange],
	);

	const handleDeleteProfile = useCallback(
		(id: string) => {
			const updated = profiles.filter((p) => p.id !== id);
			setProfiles(updated);
			saveProfiles(updated);
		},
		[profiles],
	);

	const handleConnect = useCallback(() => {
		if (isConnected) {
			onDisconnect();
		} else {
			onConnect();
		}
	}, [isConnected, onConnect, onDisconnect]);

	return (
		<div className="flex flex-col gap-4 p-4">
			{/* Saved Profiles */}
			{profiles.length > 0 && (
				<div className="space-y-2">
					<Label className="text-xs text-text-tertiary uppercase tracking-wider">
						Saved Profiles
					</Label>
					<div className="space-y-1">
						{profiles.map((profile) => (
							<div
								key={profile.id}
								className="flex items-center gap-2 group"
							>
								<button
									className={cn(
										'flex-1 text-left px-3 py-1.5 rounded text-sm',
										'hover:bg-bg-3 transition-colors',
										'text-text-primary',
										isDisabled && 'opacity-50 pointer-events-none',
									)}
									onClick={() =>
										handleLoadProfile(profile.id)
									}
									disabled={isDisabled}
								>
									{profile.name}
								</button>
								<button
									className="opacity-0 group-hover:opacity-100 p-1 text-text-tertiary hover:text-destructive transition-all"
									onClick={() =>
										handleDeleteProfile(profile.id)
									}
								>
									<Trash2 className="h-3.5 w-3.5" />
								</button>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Connection Settings */}
			<div className="space-y-3">
				<Label className="text-xs text-text-tertiary uppercase tracking-wider">
					Connection
				</Label>

				<div className="grid grid-cols-[1fr_80px] gap-2">
					<div>
						<Label
							htmlFor="vnc-host"
							className="text-xs text-text-secondary mb-1 block"
						>
							Host
						</Label>
						<Input
							id="vnc-host"
							placeholder="192.168.1.100 or hostname"
							value={config.host}
							onChange={(e) =>
								updateConfig({ host: e.target.value })
							}
							disabled={isDisabled}
							className="h-9"
						/>
					</div>
					<div>
						<Label
							htmlFor="vnc-port"
							className="text-xs text-text-secondary mb-1 block"
						>
							Port
						</Label>
						<Input
							id="vnc-port"
							type="number"
							placeholder="5900"
							value={config.port}
							onChange={(e) =>
								updateConfig({
									port: parseInt(e.target.value, 10) || 5900,
								})
							}
							disabled={isDisabled}
							className="h-9"
						/>
					</div>
				</div>

				<div>
					<Label
						htmlFor="vnc-password"
						className="text-xs text-text-secondary mb-1 block"
					>
						Password
					</Label>
					<div className="relative">
						<Input
							id="vnc-password"
							type={showPassword ? 'text' : 'password'}
							placeholder="VNC password"
							value={config.password}
							onChange={(e) =>
								updateConfig({ password: e.target.value })
							}
							disabled={isDisabled}
							className="h-9 pr-9"
						/>
						<button
							type="button"
							onClick={() => setShowPassword(!showPassword)}
							className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
						>
							{showPassword ? (
								<EyeOff className="h-4 w-4" />
							) : (
								<Eye className="h-4 w-4" />
							)}
						</button>
					</div>
				</div>

				<div>
					<Label
						htmlFor="vnc-path"
						className="text-xs text-text-secondary mb-1 block"
					>
						WebSocket Path
					</Label>
					<Input
						id="vnc-path"
						placeholder="websockify"
						value={config.path}
						onChange={(e) =>
							updateConfig({ path: e.target.value })
						}
						disabled={isDisabled}
						className="h-9"
					/>
				</div>

				<div className="flex items-center justify-between">
					<Label
						htmlFor="vnc-ssl"
						className="text-sm text-text-secondary"
					>
						Use SSL/TLS
					</Label>
					<Switch
						id="vnc-ssl"
						checked={config.ssl}
						onCheckedChange={(checked) =>
							updateConfig({ ssl: checked })
						}
						disabled={isDisabled}
					/>
				</div>
			</div>

			{/* Connect/Disconnect Button */}
			<Button
				onClick={handleConnect}
				disabled={
					isConnecting || (!config.host && !isConnected)
				}
				variant={isConnected ? 'destructive' : 'default'}
				className="w-full"
			>
				{isConnecting ? (
					<>Connecting...</>
				) : isConnected ? (
					<>
						<Unplug className="h-4 w-4 mr-1.5" />
						Disconnect
					</>
				) : (
					<>
						<Plug className="h-4 w-4 mr-1.5" />
						Connect
					</>
				)}
			</Button>

			{/* Save Profile */}
			{!isConnected && config.host && (
				<div className="flex gap-2">
					<Input
						placeholder="Profile name"
						value={profileName}
						onChange={(e) => setProfileName(e.target.value)}
						className="h-8 text-sm"
					/>
					<Button
						variant="outline"
						size="sm"
						onClick={handleSaveProfile}
						className="shrink-0"
					>
						<Save className="h-3.5 w-3.5 mr-1" />
						Save
					</Button>
				</div>
			)}

			{/* Advanced Settings */}
			<button
				className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
				onClick={() => setShowAdvanced(!showAdvanced)}
			>
				{showAdvanced ? (
					<ChevronUp className="h-3.5 w-3.5" />
				) : (
					<ChevronDown className="h-3.5 w-3.5" />
				)}
				Advanced Settings
			</button>

			{showAdvanced && (
				<div className="space-y-4 border-t border-bg-3 pt-3">
					<div className="flex items-center justify-between">
						<Label className="text-sm text-text-secondary">
							View Only
						</Label>
						<Switch
							checked={config.viewOnly}
							onCheckedChange={(checked) =>
								updateConfig({ viewOnly: checked })
							}
							disabled={isDisabled}
						/>
					</div>

					<div className="flex items-center justify-between">
						<Label className="text-sm text-text-secondary">
							Scale to Window
						</Label>
						<Switch
							checked={config.scaleViewport}
							onCheckedChange={(checked) =>
								updateConfig({ scaleViewport: checked })
							}
						/>
					</div>

					<div className="flex items-center justify-between">
						<Label className="text-sm text-text-secondary">
							Show Dot Cursor
						</Label>
						<Switch
							checked={config.showDotCursor}
							onCheckedChange={(checked) =>
								updateConfig({ showDotCursor: checked })
							}
						/>
					</div>

					<div className="space-y-2">
						<div className="flex justify-between">
							<Label className="text-sm text-text-secondary">
								Image Quality
							</Label>
							<span className="text-xs text-text-tertiary">
								{config.qualityLevel}/9
							</span>
						</div>
						<Slider
							value={[config.qualityLevel]}
							onValueChange={([val]) =>
								updateConfig({ qualityLevel: val })
							}
							min={0}
							max={9}
							step={1}
							disabled={isDisabled}
						/>
					</div>

					<div className="space-y-2">
						<div className="flex justify-between">
							<Label className="text-sm text-text-secondary">
								Compression
							</Label>
							<span className="text-xs text-text-tertiary">
								{config.compressionLevel}/9
							</span>
						</div>
						<Slider
							value={[config.compressionLevel]}
							onValueChange={([val]) =>
								updateConfig({
									compressionLevel: val,
								})
							}
							min={0}
							max={9}
							step={1}
							disabled={isDisabled}
						/>
					</div>

					<div>
						<Label className="text-xs text-text-secondary mb-1 block">
							Preset
						</Label>
						<Select
							onValueChange={(value) => {
								switch (value) {
									case 'quality':
										updateConfig({
											qualityLevel: 9,
											compressionLevel: 0,
										});
										break;
									case 'balanced':
										updateConfig({
											qualityLevel: 6,
											compressionLevel: 2,
										});
										break;
									case 'performance':
										updateConfig({
											qualityLevel: 3,
											compressionLevel: 6,
										});
										break;
									case 'low-bandwidth':
										updateConfig({
											qualityLevel: 1,
											compressionLevel: 9,
										});
										break;
								}
							}}
							disabled={isDisabled}
						>
							<SelectTrigger className="h-8">
								<SelectValue placeholder="Choose preset..." />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="quality">
									Best Quality
								</SelectItem>
								<SelectItem value="balanced">
									Balanced
								</SelectItem>
								<SelectItem value="performance">
									Performance
								</SelectItem>
								<SelectItem value="low-bandwidth">
									Low Bandwidth
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			)}
		</div>
	);
}
