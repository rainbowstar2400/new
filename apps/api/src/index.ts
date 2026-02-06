import { loadEnv } from "./env";
import { createServer } from "./server";

async function main() {
  const env = loadEnv();
  const app = await createServer();
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  console.log(`[api] listening on http://localhost:${env.PORT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
