import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL!,
    // The previous pg.Pool config here deliberately kept a pool of
    // connections open ("so Neon doesn't cold-start on every request").
    // That's exactly what was maxing out the project's Neon compute
    // allowance: Neon only autosuspends a compute once every connection
    // to it drops, so a pool that never lets go of its connections keeps
    // the compute billed as "active" around the clock, no matter how
    // light actual traffic is.
    //
    // @prisma/adapter-neon talks to Neon over its low-latency WebSocket
    // proxy instead of a raw TCP+TLS connection, which is what makes it
    // cheap to open a fresh connection per burst of traffic rather than
    // holding one open indefinitely. A short idleTimeoutMillis lets idle
    // connections close quickly so the compute can actually suspend
    // between requests, while still reusing a pooled connection within a
    // burst of traffic (page load doing several queries, etc).
    idleTimeoutMillis: 10_000,
    max: process.env.NODE_ENV === "production" ? 10 : 3,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
