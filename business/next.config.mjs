/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/business',
  assetPrefix: '/business',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
