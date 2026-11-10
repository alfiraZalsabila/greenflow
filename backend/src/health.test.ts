import { createServer, type Server } from "node:http";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  process.env.LOG_LEVEL = "silent";
  const { app } = await import("./app.js");

  server = createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Alamat server uji tidak valid");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe("health check", () => {
  it.each(["/healthz", "/api/v1/healthz"])(
    "%s mengembalikan status 200",
    async (path) => {
      const res = await fetch(`${baseUrl}${path}`);

      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toMatchObject({
        ok: true,
        service: "greenflow-api",
      });
    },
  );
});

describe("rute tidak dikenal", () => {
  it("mengembalikan 404 berformat JSON", async () => {
    const res = await fetch(`${baseUrl}/api/v1/tidak-ada`);

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: "NOT_FOUND" },
    });
  });
});
