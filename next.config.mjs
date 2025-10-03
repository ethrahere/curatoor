import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence warnings
  // https://github.com/WalletConnect/walletconnect-monorepo/issues/1908
  webpack: (config) => {
    config.externals = config.externals ?? [];
    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    config.resolve = config.resolve ?? {};
    config.resolve.alias = config.resolve.alias ?? {};
    config.resolve.alias['@react-native-async-storage/async-storage'] = path.resolve(
      process.cwd(),
      'app/lib/asyncStorageStub.ts',
    );

    return config;
  },
};

export default nextConfig;
