import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migracoes = await readD1Migrations("./migrations");
  return {
    plugins: [
      cloudflareTest({
        miniflare: {
          compatibilityDate: "2026-10-01",
          d1Databases: ["DB"],
          ratelimits: { LIMITE_POR_IP: { namespace_id: "12001", simple: { limit: 5, period: 60 } } },
          bindings: { MIGRACOES: migracoes, TURNSTILE_SECRET: "segredo-de-teste" },
        },
      }),
    ],
    test: { setupFiles: ["./test/preparar.ts"] },
  };
});
