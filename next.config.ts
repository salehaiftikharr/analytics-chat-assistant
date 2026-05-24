import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Emit a minimal standalone server (.next/standalone/server.js) with only the
  // traced node_modules — the basis for the lean production Docker image.
  output: "standalone",
  // Pin the workspace root to this project so Turbopack doesn't latch onto a
  // stray package-lock.json in a parent/home directory.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
