// SPDX-License-Identifier: MIT
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import { beforeAll, describe, expect, it } from "vitest";

import { PepkioClient } from "../src/client.js";
import { TOOL_ID } from "../src/config.js";
import { PepkioAPIError } from "../src/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const monorepoEnv = resolve(__dirname, "../../../.env");
if (existsSync(monorepoEnv)) {
  loadEnv({ path: monorepoEnv });
}

const packageEnv = resolve(__dirname, "../.env");
if (existsSync(packageEnv)) {
  loadEnv({ path: packageEnv });
}

const ENVIRONMENTS = [
  { name: "local", baseUrl: "https://tools.localtest.me" },
  { name: "production", baseUrl: "https://tools.pepkio.com" },
] as const;

function resolveEnvironments(): Array<{ name: string; baseUrl: string }> {
  const override = process.env.PEPKIO_API_BASE_URL;
  if (override) {
    const name = override.includes("localtest.me") ? "local" : "production";
    return [{ name, baseUrl: override.replace(/\/$/, "") }];
  }
  return [...ENVIRONMENTS];
}

function apiKeyFor(baseUrl: string): string | undefined {
  if (baseUrl.includes("localtest.me")) {
    return process.env.LOCAL_PEPKIO_API_KEY ?? process.env.PEPKIO_API_KEY;
  }
  return process.env.PEPKIO_API_KEY;
}

describe.each(resolveEnvironments())("$name integration", (env) => {
  let client: PepkioClient | null = null;
  let skipReason: string | null = null;

  beforeAll(async () => {
    const apiKey = apiKeyFor(env.baseUrl);
    if (!apiKey) {
      skipReason = `No API key for ${env.name} (set LOCAL_PEPKIO_API_KEY or PEPKIO_API_KEY)`;
      return;
    }
    const candidate = new PepkioClient({ apiKey, baseUrl: env.baseUrl });
    try {
      await candidate.getManifest({ refresh: true, fallback: false });
      client = candidate;
    } catch (err) {
      if (
        err instanceof PepkioAPIError &&
        (err.statusCode === 404 || err.code === "TOOL_NOT_FOUND" || err.status === 404)
      ) {
        skipReason = `Tool not deployed on ${env.name} (${env.baseUrl})`;
        return;
      }
      throw err;
    }
  });

  function liveIt(name: string, fn: (c: PepkioClient) => Promise<void>) {
    it(name, async () => {
      if (skipReason || !client) {
        return;
      }
      await fn(client);
    });
  }

  liveIt("fetches manifest", async (c) => {
    const manifest = await c.getManifest({ refresh: true });
    expect(manifest.tool_id).toBe(TOOL_ID);
    expect(manifest.title).toBeTruthy();
    const names = manifest.examples?.map((e) => e.name) ?? [];
    expect(names.length).toBeGreaterThan(0);
  });

  liveIt("runs export_benchmark_tools example", async (c) => {
    const input = await c.getExampleInput("export_benchmark_tools");
    const result = await c.run(input);

    expect(result.status).toBe("completed");
    expect(result.error).toBeFalsy();
    expect(result.run_id).toBeTruthy();
    expect(result.result).toBeDefined();
    expect(result.result?.exported_count).toBeGreaterThan(0);
  });

  liveIt("runs info action", async (c) => {
    const result = await c.info();
    expect(result.status).toBe("completed");
    expect(result.run_id).toBeTruthy();
    expect(result.result?.summary?.papers_count).toBeGreaterThan(0);
  });

  liveIt("fetches previous run via getRun()", async (c) => {
    const initial = await c.info();
    expect(initial.run_id).toBeTruthy();
    const fetched = await c.getRun(initial.run_id);
    expect(fetched.run_id).toBe(initial.run_id);
    expect(fetched.status).toBe("completed");
  });
});

describe("offline / local fallback behavior", () => {
  it("provides full functionality via local dataset even without deployed server", async () => {
    const client = new PepkioClient({
      baseUrl: "https://tools.pepkio.com",
      localFallback: true,
    });

    const manifest = await client.getManifest();
    expect(manifest.tool_id).toBe(TOOL_ID);
    expect(manifest.examples?.length).toBeGreaterThan(0);

    const info = await client.info();
    expect(info.status).toBe("completed");
    expect(info.result?.summary?.papers_count).toBe(7);
    expect(info.result?.summary?.benchmark_count).toBe(34);

    const exported = await client.exportBenchmark({ category: "Tools", format: "json" });
    expect(exported.status).toBe("completed");
    expect(exported.result?.exported_count).toBe(7);
  });
});
