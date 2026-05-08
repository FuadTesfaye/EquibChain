/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ["@equbchain/sdk", "@equbchain/ui", "@equbchain/types"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    domains: ["solana.com"],
    formats: ["image/webp", "image/avif"],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;
