import { env } from "./lib/env";
import { createApp } from "./app";
import { prisma } from "./lib/prisma";

const app = createApp();
const server = app.listen(env.port, () => {
  console.log(`API hazır → http://localhost:${env.port}/api`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
