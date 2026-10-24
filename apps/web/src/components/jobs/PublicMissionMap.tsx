'use client';

import { Text } from '@mantine/core';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { markerPosition, tileLayerFor } from './public-map';

const pin = L.divIcon({
  className: 'bf-public-pin',
  html: '<span class="bf-public-pin-dot"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

type Props = {
  publicLatitude?: number | null;
  publicLongitude?: number | null;
  landmark?: string | null;
};

function PointMap({
  latitude,
  longitude,
  ariaLabel,
  caption,
}: {
  latitude: number;
  longitude: number;
  ariaLabel: string;
  caption?: string | null;
}) {
  const tiles = tileLayerFor(process.env.NEXT_PUBLIC_MAPTILER_API_KEY);
  return (
    <div>
      <style>{`
        .leaflet-div-icon.bf-public-pin { background: transparent; border: none; }
        .bf-public-pin-dot {
          display: block;
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: var(--color-brand-flash);
          border: 2px solid #fff;
          box-shadow: 0 1px 4px rgba(25, 74, 121, 0.35);
        }
      `}</style>
      {/* Contexte d’empilement isolé : les calques Leaflet (z-index 400+) restent sous les modales. */}
      <div
        aria-label={ariaLabel}
        style={{ height: 220, borderRadius: 12, overflow: 'hidden', position: 'relative', isolation: 'isolate' }}
      >
        <MapContainer
          center={[latitude, longitude]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
          attributionControl={false}
        >
          <TileLayer url={tiles.url} />
          <Marker position={[latitude, longitude]} icon={pin} />
        </MapContainer>
      </div>
      {caption ? (
        <Text size="xs" c="dimmed" mt={6}>
          {caption}
        </Text>
      ) : null}
    </div>
  );
}

/** Carte du repère public. Aucune prop d’adresse exacte. */
export function PublicMissionMap({ publicLatitude, publicLongitude, landmark }: Props) {
  const point = markerPosition({ publicLatitude, publicLongitude });
  if (!point) return null;
  return (
    <PointMap
      latitude={point.latitude}
      longitude={point.longitude}
      ariaLabel={landmark ? `Carte du repère public : ${landmark}` : 'Carte du repère public'}
      caption={landmark ? `Repère public : ${landmark}` : null}
    />
  );
}

/**
 * Point de l’adresse exacte (BF-S-07, après acceptation). Réservé à l’écran Coordonnées des parties,
 * alimenté par `GET /participations/{id}/contact` ; jamais par le détail public.
 */
export function PrivateMissionMap({
  latitude,
  longitude,
}: {
  latitude?: number | null;
  longitude?: number | null;
}) {
  const point = markerPosition({ publicLatitude: latitude, publicLongitude: longitude });
  if (!point) return null;
  return (
    <PointMap
      latitude={point.latitude}
      longitude={point.longitude}
      ariaLabel="Carte de l’adresse exacte de la mission"
      caption="Point de l’adresse exacte, visible seulement par les deux parties."
    />
  );
}
