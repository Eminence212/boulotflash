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

/** Carte du repère public. Aucune prop d’adresse exacte. */
export function PublicMissionMap({
  publicLatitude,
  publicLongitude,
  landmark,
}: Props) {
  const point = markerPosition({ publicLatitude, publicLongitude });
  if (!point) return null;
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
          background: #3EA4FF;
          border: 2px solid #fff;
          box-shadow: 0 1px 4px rgba(25, 74, 121, 0.35);
        }
      `}</style>
      <div
        aria-label={
          landmark ? `Carte du repère public : ${landmark}` : 'Carte du repère public'
        }
        style={{ height: 220, borderRadius: 12, overflow: 'hidden' }}
      >
        <MapContainer
          center={[point.latitude, point.longitude]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
          attributionControl={false}
        >
          <TileLayer url={tiles.url} />
          <Marker position={[point.latitude, point.longitude]} icon={pin} />
        </MapContainer>
      </div>
      {landmark ? (
        <Text size="xs" c="dimmed" mt={6}>
          Repère public : {landmark}
        </Text>
      ) : null}
    </div>
  );
}
