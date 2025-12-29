/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
  experimental: {
    turbo: false, // Disable Turbopack
  },
};
