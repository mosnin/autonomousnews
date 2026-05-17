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
  async rewrites() {
    return [
      // IndexNow key verification: the spec wants the key file at /<key>.txt,
      // but our route handler lives at /api/indexnow/<key>. Rewrite any
      // /<something>.txt request to that handler; the handler 404s on mismatch.
      { source: "/:key(.+)\\.txt", destination: "/api/indexnow/:key" },
    ];
  },
};

export default nextConfig;
