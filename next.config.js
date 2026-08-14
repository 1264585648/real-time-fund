/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 部署到 nginx 子路径 /fund，并静态导出（无需服务器跑 Node）
  basePath: '/fund',
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

module.exports = nextConfig;
