import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Reminders change from Server Actions elsewhere in the app (create/complete/
    // delete), so the client Router Cache's default staleness window caused
    // navigating away and back to /app to sometimes serve an outdated snapshot
    // missing a just-created reminder — real data, wrong cached render. Disabling
    // the cache for dynamic routes forces a fresh Server Component fetch on every
    // navigation instead.
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
