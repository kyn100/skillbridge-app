/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pg', 'pg-native', 'pg-pool', 'pg-protocol', 'pg-types'],
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'pg-native': false,
    };
    return config;
  },
};

export default nextConfig;
