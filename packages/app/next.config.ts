import type { NextConfig } from "next";

const config: NextConfig = {
  // workspace packages ship TypeScript source
  transpilePackages: ["@kakushi/sdk", "@kakushi/config", "@kakushi/prover", "@kakushi/ui", "@kakushi/widget", "@kakushi/relayer"],
  reactStrictMode: true,
  // bb.js uses SharedArrayBuffer in its proving worker. Apply to documents AND worker chunks.
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
    ] }];
  },
  output: process.env.KAKUSHI_NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  experimental: { cpus: 1 },
  outputFileTracingIncludes: { "/api/config": ["./deployments/**"], "/api/relayer/[...path]": ["./deployments/**"] },
};

export default config;
