/** @type {import('next').NextConfig} */
const nextConfig = {
  // 使用 standalone 产物以支持 API Route、proxy 与按需服务端渲染；
  // 静态导出（output: 'export'）会与 app/api/** 和 proxy.ts 冲突。
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  images: {
    unoptimized: true,
  },
}

export default nextConfig
