import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin pulls in native gRPC bindings that don't bundle
  // cleanly through Next.js's server bundler — without this, Vercel's
  // serverless functions fail at runtime with "Failed to load external
  // module" even though `next build` succeeds locally and in CI. This
  // tells Next.js to leave firebase-admin as a normal node_modules
  // dependency (resolved via Node's require() at runtime) instead of
  // trying to bundle it.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;