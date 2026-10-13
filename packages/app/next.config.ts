import type { NextConfig } from "next";

const config: NextConfig = {
  // workspace packages ship TypeScript source
  transpilePackages: ["@kakushi/sdk", "@kakushi/config", "@kakushi/prover", "@kakushi/ui", "@kakushi/widget"],
  reactStrictMode: true,
  output: process.env.KAKUSHI_NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  experimental: { cpus: 1 },
  outputFileTracingIncludes: { "/api/config": ["./deployments/**"], "/api/relayer/[...path]": ["./deployments/**"] },
};

export default config;
