import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // firebase-admin pulls in native gRPC bindings that don't bundle
  // cleanly through Next.js's server bundler — without this, Vercel's
  // serverless functions fail at runtime with "Failed to load external
  // module" even though `next build` succeeds locally and in CI. This
  // tells Next.js to leave firebase-admin as a normal node_modules
  // dependency (resolved via Node's require() at runtime) instead of
  // trying to bundle it.
  serverExternalPackages: ["firebase-admin"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
