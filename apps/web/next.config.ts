import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@boulotflash/contracts'],
};

export default nextConfig;
