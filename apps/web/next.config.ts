import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@boulotflash/contracts', 'react-leaflet', 'leaflet'],
};

export default nextConfig;
