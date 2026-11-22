import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is intentionally disabled: every route in NesiPlan is
  // per-user authenticated (Supabase session cookies) and realtime, so there is
  // no static shell to gain, and `use cache` scopes cannot refresh auth cookies.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
