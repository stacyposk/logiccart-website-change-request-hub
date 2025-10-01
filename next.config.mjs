/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  trailingSlash: true,
  // Fix hydration issues with static export
  reactStrictMode: false,
  // Ensure proper static generation
}

export default nextConfig