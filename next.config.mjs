/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 640, 750, 1080, 1280, 1536, 1920],
    minimumCacheTTL: 60 * 60 * 24, // 1 day
  },
  experimental: {
    optimizePackageImports: ["@supabase/supabase-js", "@upstash/redis"],
  },
};

export default nextConfig;
