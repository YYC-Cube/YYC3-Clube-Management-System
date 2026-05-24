/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  outputFileTracingRoot: process.cwd(),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['bcryptjs', 'pg'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost:3555', 'localhost:5001'],
    },
    optimizePackageImports: ['lucide-react', 'recharts', '@radix-ui/react-icons'],
  },
  images: {
    unoptimized: true,
  },
  webpack: config => {
    return config
  },
}

export default nextConfig
