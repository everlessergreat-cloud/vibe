import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation, MapPin, Phone, Clock, Locate, CornerDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const RESORT_LOCATION: [number, number] = [14.5547, 121.0244];
const RESORT_INFO = {
	name: 'Paradise Bay Resort',
	address: '123 Coastal Drive, Tropical Bay',
	phone: '+1 (555) 123-4567',
	hours: 'Open 24/7 - Check-in: 2:00 PM, Check-out: 12:00 PM',
	description:
		'A luxury beachfront resort featuring world-class amenities, stunning ocean views, and unforgettable experiences.',
};

const resortIcon = new L.Icon({
	iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
	shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	shadowSize: [41, 41],
});

const userIcon = new L.Icon({
	iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
	shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
	iconSize: [20, 33],
	iconAnchor: [10, 33],
	popupAnchor: [1, -28],
	shadowSize: [33, 33],
});

interface RouteData {
	coordinates: [number, number][];
	distance: string;
	duration: string;
}

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression }) {
	const map = useMap();
	React.useEffect(() => {
		map.fitBounds(bounds, { padding: [50, 50] });
	}, [map, bounds]);
	return null;
}

function RecenterButton({ position }: { position: [number, number] }) {
	const map = useMap();
	return (
		<button
			onClick={() => map.setView(position, 15)}
			className="absolute bottom-4 right-4 z-[1000] rounded-lg bg-white p-2 shadow-md transition-colors hover:bg-gray-100"
			title="Center on resort"
		>
			<MapPin className="h-5 w-5 text-gray-700" />
		</button>
	);
}

export default function LocationMap() {
	const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null);
	const [route, setRoute] = React.useState<RouteData | null>(null);
	const [isLocating, setIsLocating] = React.useState(false);
	const [locationError, setLocationError] = React.useState<string | null>(null);
	const [isLoadingRoute, setIsLoadingRoute] = React.useState(false);

	const getUserLocation = React.useCallback(() => {
		if (!navigator.geolocation) {
			setLocationError('Geolocation is not supported by your browser.');
			return;
		}
		setIsLocating(true);
		setLocationError(null);
		navigator.geolocation.getCurrentPosition(
			(position) => {
				const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
				setUserLocation(coords);
				setIsLocating(false);
			},
			(error) => {
				const messages: Record<number, string> = {
					[GeolocationPositionError.PERMISSION_DENIED]: 'Location access denied. Please enable location permissions.',
					[GeolocationPositionError.POSITION_UNAVAILABLE]: 'Location information is unavailable.',
					[GeolocationPositionError.TIMEOUT]: 'Location request timed out. Please try again.',
				};
				setLocationError(messages[error.code] || 'An unknown error occurred.');
				setIsLocating(false);
			},
			{ enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
		);
	}, []);

	const fetchRoute = React.useCallback(async () => {
		if (!userLocation) return;
		setIsLoadingRoute(true);
		try {
			const [userLng, userLat] = [userLocation[1], userLocation[0]];
			const [resortLng, resortLat] = [RESORT_LOCATION[1], RESORT_LOCATION[0]];
			const response = await fetch(
				`https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${resortLng},${resortLat}?overview=full&geometries=geojson`
			);
			const data = await response.json();
			if (data.routes && data.routes.length > 0) {
				const routeData = data.routes[0];
				const coords: [number, number][] = routeData.geometry.coordinates.map(
					(coord: [number, number]) => [coord[1], coord[0]]
				);
				const distanceKm = (routeData.distance / 1000).toFixed(1);
				const durationMin = Math.round(routeData.duration / 60);
				const hours = Math.floor(durationMin / 60);
				const mins = durationMin % 60;
				const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
				setRoute({
					coordinates: coords,
					distance: `${distanceKm} km`,
					duration: durationStr,
				});
			}
		} catch {
			setLocationError('Could not fetch directions. Please try again.');
		} finally {
			setIsLoadingRoute(false);
		}
	}, [userLocation]);

	React.useEffect(() => {
		if (userLocation) {
			fetchRoute();
		}
	}, [userLocation, fetchRoute]);

	const bounds: L.LatLngBoundsExpression | null = userLocation
		? [userLocation, RESORT_LOCATION]
		: null;

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
			<div className="flex flex-col gap-2">
				<h1 className="text-2xl font-bold text-text-primary md:text-3xl">
					Find Us - {RESORT_INFO.name}
				</h1>
				<p className="text-sm text-text-secondary">
					Use the map below to get directions to our resort. Click &quot;Get My Location&quot; to see the route from your current position.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				{/* Sidebar info */}
				<div className="flex flex-col gap-4 lg:col-span-1">
					<Card className="border-border bg-bg-2">
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center gap-2 text-text-primary">
								<MapPin className="h-5 w-5 text-accent" />
								Resort Details
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<div>
								<h3 className="font-semibold text-text-primary">{RESORT_INFO.name}</h3>
								<p className="mt-1 text-sm text-text-secondary">{RESORT_INFO.description}</p>
							</div>
							<div className="flex items-start gap-2">
								<Navigation className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" />
								<span className="text-sm text-text-secondary">{RESORT_INFO.address}</span>
							</div>
							<div className="flex items-center gap-2">
								<Phone className="h-4 w-4 shrink-0 text-text-tertiary" />
								<span className="text-sm text-text-secondary">{RESORT_INFO.phone}</span>
							</div>
							<div className="flex items-start gap-2">
								<Clock className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" />
								<span className="text-sm text-text-secondary">{RESORT_INFO.hours}</span>
							</div>
						</CardContent>
					</Card>

					<Card className="border-border bg-bg-2">
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center gap-2 text-text-primary">
								<CornerDownRight className="h-5 w-5 text-accent" />
								Directions
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-3">
							<Button
								onClick={getUserLocation}
								disabled={isLocating}
								className="w-full"
								variant="default"
							>
								<Locate className="mr-2 h-4 w-4" />
								{isLocating ? 'Locating...' : 'Get My Location'}
							</Button>

							{locationError && (
								<p className="text-sm text-destructive">{locationError}</p>
							)}

							{route && (
								<div className="rounded-lg border border-border bg-bg-3 p-3">
									<div className="flex items-center justify-between">
										<span className="text-sm font-medium text-text-primary">Distance</span>
										<span className="text-sm text-text-secondary">{route.distance}</span>
									</div>
									<div className="mt-2 flex items-center justify-between">
										<span className="text-sm font-medium text-text-primary">Est. Drive Time</span>
										<span className="text-sm text-text-secondary">{route.duration}</span>
									</div>
								</div>
							)}

							{isLoadingRoute && (
								<p className="text-sm text-text-tertiary">Calculating route...</p>
							)}

							{!userLocation && !locationError && (
								<p className="text-xs text-text-tertiary">
									Click the button above to share your location and get driving directions to the resort.
								</p>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Map */}
				<div className="lg:col-span-2">
					<Card className={cn('overflow-hidden border-border bg-bg-2')}>
						<div className="relative h-[400px] md:h-[550px]">
							<MapContainer
								center={RESORT_LOCATION}
								zoom={14}
								className="h-full w-full"
								scrollWheelZoom={true}
							>
								<TileLayer
									attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
									url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
								/>

								<Marker position={RESORT_LOCATION} icon={resortIcon}>
									<Popup>
										<strong>{RESORT_INFO.name}</strong>
										<br />
										{RESORT_INFO.address}
										<br />
										{RESORT_INFO.phone}
									</Popup>
								</Marker>

								{userLocation && (
									<Marker position={userLocation} icon={userIcon}>
										<Popup>Your Location</Popup>
									</Marker>
								)}

								{route && (
									<Polyline
										positions={route.coordinates}
										pathOptions={{ color: '#f6821f', weight: 4, opacity: 0.8 }}
									/>
								)}

								{bounds && <FitBounds bounds={bounds} />}

								<RecenterButton position={RESORT_LOCATION} />
							</MapContainer>
						</div>
					</Card>
				</div>
			</div>
		</div>
	);
}
