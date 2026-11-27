import { applyD1Migrations, env } from "cloudflare:test";

declare global {
  namespace Cloudflare {
    interface Env {
      MIGRACOES: import("cloudflare:test").D1Migration[];
    }
  }
}

await applyD1Migrations(env.DB, env.MIGRACOES);
