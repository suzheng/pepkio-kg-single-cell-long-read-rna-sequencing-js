// SPDX-License-Identifier: MIT
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PepkioClient } from "../src/client.js";
import {
  DEFAULT_API_BASE_URL,
  TOOL_ID,
  apiPath,
  isLocalUrl,
  resolveApiKey,
  resolveBaseUrl,
} from "../src/config.js";
import { KnowledgeExplorer } from "../src/explorer.js";
import { parseRunInput } from "../src/schemas.js";
import { PepkioAPIError, type ToolManifest } from "../src/types.js";

const mockManifest: ToolManifest = {
  schema_version: "1.0",
  tool_id: TOOL_ID,
  title: "Single-Cell Long-Read RNA Sequencing Knowledge Explorer",
  description: "Mock manifest description",
  examples: [
    {
      name: "export_benchmark_tools",
      description: "Export tools benchmark",
      input: {
        action: "export_benchmark",
        category: "Tools",
        format: "json",
      },
    },
    {
      name: "query_summary",
      description: "Get summary",
      input: {
        action: "info",
      },
    },
  ],
};

describe("config utilities", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.PEPKIO_API_BASE_URL;
    delete process.env.PEPKIO_API_KEY;
    delete process.env.LOCAL_PEPKIO_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("resolves default production URL when no override or env set", () => {
    expect(resolveBaseUrl()).toBe(DEFAULT_API_BASE_URL);
    expect(DEFAULT_API_BASE_URL).toBe("https://tools.pepkio.com");
  });

  it("strips trailing slash from base URL override", () => {
    expect(resolveBaseUrl("https://custom.example.com/")).toBe("https://custom.example.com");
  });

  it("prefers constructor baseUrl over env var", () => {
    process.env.PEPKIO_API_BASE_URL = "https://env.example.com";
    expect(resolveBaseUrl("https://override.example.com")).toBe("https://override.example.com");
  });

  it("reads PEPKIO_API_BASE_URL when no override passed", () => {
    process.env.PEPKIO_API_BASE_URL = "https://env.example.com/";
    expect(resolveBaseUrl()).toBe("https://env.example.com");
  });

  it("detects local URLs correctly", () => {
    expect(isLocalUrl("https://tools.localtest.me")).toBe(true);
    expect(isLocalUrl("http://localhost:3004")).toBe(true);
    expect(isLocalUrl("http://127.0.0.1:3004")).toBe(true);
    expect(isLocalUrl("https://tools.pepkio.com")).toBe(false);
  });

  it("resolves local vs production API keys appropriately", () => {
    process.env.PEPKIO_API_KEY = "prod-key";
    process.env.LOCAL_PEPKIO_API_KEY = "local-key";

    expect(resolveApiKey("https://tools.pepkio.com")).toBe("prod-key");
    expect(resolveApiKey("https://tools.localtest.me")).toBe("local-key");
    expect(resolveApiKey("https://tools.localtest.me", "explicit-key")).toBe("explicit-key");
  });

  it("builds API paths with apiPath helper", () => {
    expect(apiPath("https://tools.pepkio.com", "/tools/test")).toBe(
      "https://tools.pepkio.com/api/tools/v1/tools/test",
    );
    expect(apiPath("https://tools.pepkio.com", "tools/test")).toBe(
      "https://tools.pepkio.com/api/tools/v1/tools/test",
    );
  });
});

describe("schemas", () => {
  it("defaults action to info when empty object provided", () => {
    const parsed = parseRunInput({});
    expect(parsed.action).toBe("info");
  });

  it("parses valid export_benchmark input", () => {
    const parsed = parseRunInput({
      action: "export_benchmark",
      category: "Tools",
      difficulty: "intermediate",
      format: "csv",
    });
    expect(parsed.action).toBe("export_benchmark");
    expect(parsed.category).toBe("Tools");
    expect(parsed.difficulty).toBe("intermediate");
    expect(parsed.format).toBe("csv");
  });

  it("parses valid query input", () => {
    const parsed = parseRunInput({
      action: "query",
      type: "tools",
      query: "bambu",
      limit: 10,
    });
    expect(parsed.action).toBe("query");
    expect(parsed.type).toBe("tools");
    expect(parsed.query).toBe("bambu");
    expect(parsed.limit).toBe(10);
  });
});

describe("KnowledgeExplorer", () => {
  it("loads bundled dataset with correct counts", () => {
    const explorer = KnowledgeExplorer.load();
    expect(explorer.meta.title).toBeTruthy();
    expect(explorer.papers.length).toBe(7);
    expect(explorer.concepts.length).toBe(46);
    expect(explorer.tools.length).toBe(72);
    expect(explorer.benchmark.length).toBe(34);
    expect(explorer.relationships.length).toBeGreaterThan(0);
  });

  it("filters benchmark by category and difficulty", () => {
    const explorer = KnowledgeExplorer.load();
    const toolsBench = explorer.filterBenchmark({ category: "Tools" });
    expect(toolsBench.length).toBe(7);
    for (const b of toolsBench) {
      expect(b.category).toBe("Tools");
    }

    const beginnerBench = explorer.filterBenchmark({ difficulty: "beginner" });
    expect(beginnerBench.length).toBe(12);

    const filtered = explorer.filterBenchmark({
      category: "Tools",
      difficulty: "intermediate",
    });
    expect(filtered.length).toBeGreaterThan(0);
  });

  it("exports benchmark as JSON and CSV", () => {
    const explorer = KnowledgeExplorer.load();
    const jsonExp = explorer.exportBenchmark({ category: "Tools", format: "json" });
    expect(jsonExp.format).toBe("json");
    expect(jsonExp.count).toBe(7);
    const parsed = JSON.parse(jsonExp.content);
    expect(parsed.benchmark.length).toBe(7);

    const csvExp = explorer.exportBenchmark({ category: "Tools", format: "csv" });
    expect(csvExp.format).toBe("csv");
    expect(csvExp.content).toContain("ground_truth_answer");
    expect(csvExp.content).toContain("bambu");
  });

  it("executes action info and query", () => {
    const explorer = KnowledgeExplorer.load();
    const infoRes = explorer.execute({ action: "info", format: "json" });
    expect(infoRes.action).toBe("info");
    expect(infoRes.summary?.papers_count).toBe(7);

    const queryTools = explorer.execute({
      action: "query",
      type: "tools",
      query: "bambu",
      format: "json",
    });
    expect(queryTools.action).toBe("query");
    expect(queryTools.tools?.length).toBeGreaterThan(0);
    expect(queryTools.tools?.[0].name.toLowerCase()).toContain("bambu");
  });
});

describe("PepkioClient", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns bundled manifest when fallback is enabled and API is unavailable", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Connection refused"));
    globalThis.fetch = mockFetch;

    const client = new PepkioClient({ apiKey: "test-key" });
    const manifest = await client.getManifest();

    expect(manifest.tool_id).toBe(TOOL_ID);
    expect(manifest.title).toContain("Single-Cell Long-Read");
    expect(manifest.examples?.length).toBeGreaterThan(0);
  });

  it("returns fetched manifest when API responds with 200", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockManifest),
    });
    globalThis.fetch = mockFetch;

    const client = new PepkioClient({ apiKey: "test-key" });
    const manifest = await client.getManifest();

    expect(manifest.tool_id).toBe(TOOL_ID);
    expect(manifest.description).toBe("Mock manifest description");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://tools.pepkio.com/api/tools/v1/tools/kg-single-cell-long-read-rna-sequencing/manifest",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("lists examples and gets example input", async () => {
    const client = new PepkioClient({ apiKey: "test-key" });
    const examples = client.listExamples();
    expect(examples.length).toBeGreaterThan(0);
    expect(examples.map((e) => e.name)).toContain("export_benchmark_tools");

    const input = await client.getExampleInput("export_benchmark_tools");
    expect(input.action).toBe("export_benchmark");
    expect(input.category).toBe("Tools");
  });

  it("throws error for non-existent example", async () => {
    const client = new PepkioClient({ apiKey: "test-key" });
    await expect(client.getExampleInput("non_existent_example")).rejects.toThrow(
      /Example "non_existent_example" not found/,
    );
  });

  it("executes run against API when API responds with 200", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          run_id: "api-run-123",
          status: "completed",
          result: { action: "info", summary: { papers_count: 7 } },
          error: null,
        }),
    });
    globalThis.fetch = mockFetch;

    const client = new PepkioClient({ apiKey: "test-key" });
    const res = await client.run({ action: "info" });

    expect(res.run_id).toBe("api-run-123");
    expect(res.status).toBe("completed");
    expect(res.result?.summary?.papers_count).toBe(7);
  });

  it("falls back to local execution when API returns 404", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () =>
        JSON.stringify({
          error: {
            code: "TOOL_NOT_FOUND",
            message: "Tool not found: kg-single-cell-long-read-rna-sequencing",
          },
        }),
    });
    globalThis.fetch = mockFetch;

    const client = new PepkioClient({ apiKey: "test-key" });
    const res = await client.run({ action: "info" });

    expect(res.status).toBe("completed");
    expect(res.run_id).toContain("run_local_");
    expect(res.result?.summary?.papers_count).toBe(7);
  });

  it("convenience methods info, exportBenchmark, filterBenchmark, and query execute correctly", async () => {
    const client = new PepkioClient({ apiKey: "test-key" });
    // Using local execution by letting mock fetch 404
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () =>
        JSON.stringify({
          error: { code: "TOOL_NOT_FOUND", message: "Tool not found" },
        }),
    });
    globalThis.fetch = mockFetch;

    const infoRes = await client.info();
    expect(infoRes.status).toBe("completed");
    expect(infoRes.result?.summary?.benchmark_count).toBe(34);

    const exportRes = await client.exportBenchmark({ category: "Tools", format: "json" });
    expect(exportRes.status).toBe("completed");
    expect(exportRes.result?.exported_count).toBe(7);

    const filterRes = await client.filterBenchmark({ difficulty: "beginner" });
    expect(filterRes.status).toBe("completed");
    expect(filterRes.result?.benchmark?.length).toBe(12);

    const queryRes = await client.query("tools", { query: "bambu" });
    expect(queryRes.status).toBe("completed");
    expect(queryRes.result?.tools?.length).toBeGreaterThan(0);
  });

  it("retrieves run by ID using getRun", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          run_id: "run-abc",
          status: "completed",
          result: { action: "info" },
        }),
    });
    globalThis.fetch = mockFetch;

    const client = new PepkioClient({ apiKey: "test-key" });
    const res = await client.getRun("run-abc");

    expect(res.run_id).toBe("run-abc");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://tools.pepkio.com/api/tools/v1/runs/run-abc",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("waitForRun polls until completed", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({ run_id: "async-run", status: "running" }),
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            run_id: "async-run",
            status: "completed",
            result: { action: "info" },
          }),
      };
    });
    globalThis.fetch = mockFetch;

    const client = new PepkioClient({ apiKey: "test-key" });
    const res = await client.waitForRun("async-run", {
      intervalMs: 10,
      timeoutMs: 2000,
    });

    expect(res.status).toBe("completed");
    expect(callCount).toBe(2);
  });

  it("waitForRun throws when run fails with error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          run_id: "failed-run",
          status: "failed",
          error: "Process exceeded memory limit",
        }),
    });
    globalThis.fetch = mockFetch;

    const client = new PepkioClient({ apiKey: "test-key" });
    await expect(
      client.waitForRun("failed-run", { intervalMs: 10, timeoutMs: 1000 }),
    ).rejects.toThrow(/Process exceeded memory limit/);
  });

  it("throws PepkioAPIError when requireAuth is true and apiKey is missing", async () => {
    delete process.env.PEPKIO_API_KEY;
    delete process.env.LOCAL_PEPKIO_API_KEY;

    const client = new PepkioClient({ baseUrl: "https://tools.pepkio.com" });
    await expect(client.run({ action: "info" }, undefined, { fallback: false })).rejects.toMatchObject({
      name: "PepkioAPIError",
      status: 401,
      message: expect.stringContaining("API key required"),
    });
  });

  it("throws PepkioAPIError with code and status when API returns error and fallback is disabled", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () =>
        JSON.stringify({
          error: { message: "Invalid parameters", code: "INVALID_INPUT" },
        }),
    });
    globalThis.fetch = mockFetch;

    const client = new PepkioClient({ apiKey: "test-key" });
    await expect(
      client.run({ action: "info" }, undefined, { fallback: false }),
    ).rejects.toMatchObject({
      name: "PepkioAPIError",
      status: 400,
      message: "Invalid parameters",
      code: "INVALID_INPUT",
    });
  });
});
