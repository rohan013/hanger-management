/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.blob.vercel-storage.com',
      },
    ],
    localPatterns: [
      {
        pathname: '/api/image',
        search: '?**',
      },
    ],
  },
};

export default nextConfig;
