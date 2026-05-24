import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so Turbopack doesn't latch onto a
  // stray package-lock.json in a parent/home directory.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
