// SPDX-License-Identifier: MIT
import { TOOL_ID, apiPath, resolveApiKey, resolveBaseUrl } from "./config.js";
import { BUNDLED_MANIFEST } from "./data/bundledManifest.js";
import { KnowledgeExplorer } from "./explorer.js";
import {
  parseRunInput,
  type Action,
  type Difficulty,
  type ExportFormat,
  type KgSingleCellLongReadRnaSequencingInput,
  type QueryType,
} from "./schemas.js";
import {
  PepkioAPIError,
  type ExampleMeta,
  type KgSingleCellLongReadRnaSequencingResult,
  type RunOptions,
  type RunResult,
  type ToolManifest,
} from "./types.js";

export interface PepkioClientOptions {
  apiKey?: string;
  baseUrl?: string;
  localFallback?: boolean;
}

export class PepkioClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly localFallback: boolean;
  private manifestCache: ToolManifest | undefined;
  private explorerInstance: KnowledgeExplorer | undefined;

  constructor(opts: PepkioClientOptions = {}) {
    this.baseUrl = resolveBaseUrl(opts.baseUrl);
    this.apiKey = resolveApiKey(this.baseUrl, opts.apiKey);
    this.localFallback = opts.localFallback ?? true;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getApiKey(): string | undefined {
    return this.apiKey;
  }

  getExplorer(): KnowledgeExplorer {
    if (!this.explorerInstance) {
      this.explorerInstance = KnowledgeExplorer.load();
    }
    return this.explorerInstance;
  }

  async getManifest(
    opts: { refresh?: boolean; fallback?: boolean } = {},
  ): Promise<ToolManifest> {
    const allowFallback = opts.fallback ?? this.localFallback;
    if (!opts.refresh && this.manifestCache) {
      return this.manifestCache;
    }

    try {
      const manifest = await this.request<ToolManifest>(
        "GET",
        `/tools/${TOOL_ID}/manifest`,
        undefined,
        { requireAuth: false },
      );
      this.manifestCache = manifest;
      return manifest;
    } catch (err) {
      if (allowFallback) {
        this.manifestCache = BUNDLED_MANIFEST;
        return BUNDLED_MANIFEST;
      }
      throw err;
    }
  }

  listExamples(manifest?: ToolManifest): ExampleMeta[] {
    const m = manifest ?? this.manifestCache ?? BUNDLED_MANIFEST;
    if (!m?.examples) {
      return [];
    }
    return m.examples.map((e) => ({
      name: e.name,
      description: e.description,
    }));
  }

  async getExamples(manifest?: ToolManifest): Promise<ExampleMeta[]> {
    const m = manifest ?? (await this.getManifest());
    return this.listExamples(m);
  }

  async getExampleInput(
    name: string,
    manifest?: ToolManifest,
  ): Promise<KgSingleCellLongReadRnaSequencingInput> {
    const m = manifest ?? (await this.getManifest());
    const example = m.examples?.find((e) => e.name === name);
    if (!example) {
      const available = m.examples?.map((e) => e.name).join(", ") ?? "(none)";
      throw new Error(`Example "${name}" not found. Available: ${available}`);
    }
    return parseRunInput(example.input);
  }

  async run(
    input: KgSingleCellLongReadRnaSequencingInput,
    options?: RunOptions,
    opts: { fallback?: boolean } = {},
  ): Promise<RunResult<KgSingleCellLongReadRnaSequencingResult>> {
    const validated = parseRunInput(input);
    const allowFallback = opts.fallback ?? this.localFallback;

    try {
      return await this.request<RunResult<KgSingleCellLongReadRnaSequencingResult>>(
        "POST",
        `/tools/${TOOL_ID}/run`,
        { input: validated, options: options ?? {} },
        { requireAuth: true },
      );
    } catch (err) {
      if (
        allowFallback &&
        err instanceof PepkioAPIError &&
        (err.status === 404 || err.code === "TOOL_NOT_FOUND")
      ) {
        const explorer = this.getExplorer();
        const result = explorer.execute(validated);
        const localRunId = `run_local_${Date.now()}`;
        return {
          run_id: localRunId,
          status: "completed",
          result,
          error: null,
          result_url: `${this.baseUrl}/api/tools/v1/runs/${localRunId}`,
          permalink: `${this.baseUrl}/r/${localRunId}`,
        };
      }
      throw err;
    }
  }

  /**
   * Convenience helper to query knowledge graph summary and counts.
   */
  async info(
    options?: RunOptions,
  ): Promise<RunResult<KgSingleCellLongReadRnaSequencingResult>> {
    return this.run({ action: "info" }, options);
  }

  /**
   * Convenience helper to export benchmark Q&A entries in JSON or CSV format.
   */
  async exportBenchmark(
    params: {
      category?: string;
      difficulty?: Difficulty;
      format?: ExportFormat;
      query?: string;
    } = {},
    options?: RunOptions,
  ): Promise<RunResult<KgSingleCellLongReadRnaSequencingResult>> {
    return this.run(
      {
        action: "export_benchmark",
        ...params,
      },
      options,
    );
  }

  /**
   * Convenience helper to filter benchmark questions without formatting.
   */
  async filterBenchmark(
    params: {
      category?: string;
      difficulty?: Difficulty;
      query?: string;
    } = {},
    options?: RunOptions,
  ): Promise<RunResult<KgSingleCellLongReadRnaSequencingResult>> {
    return this.run(
      {
        action: "filter_benchmark",
        ...params,
      },
      options,
    );
  }

  /**
   * Convenience helper to query entities (papers, concepts, tools, relationships).
   */
  async query(
    type: QueryType,
    params: { query?: string; limit?: number } = {},
    options?: RunOptions,
  ): Promise<RunResult<KgSingleCellLongReadRnaSequencingResult>> {
    return this.run(
      {
        action: "query",
        type,
        ...params,
      },
      options,
    );
  }

  async getRun(
    runId: string,
  ): Promise<RunResult<KgSingleCellLongReadRnaSequencingResult>> {
    return this.request<RunResult<KgSingleCellLongReadRnaSequencingResult>>(
      "GET",
      `/runs/${runId}`,
      undefined,
      { requireAuth: true },
    );
  }

  async waitForRun(
    runId: string,
    opts: { intervalMs?: number; timeoutMs?: number } = {},
  ): Promise<RunResult<KgSingleCellLongReadRnaSequencingResult>> {
    const intervalMs = opts.intervalMs ?? 1000;
    const timeoutMs = opts.timeoutMs ?? 30_000;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const result = await this.getRun(runId);
      if (result.status === "completed" || result.status === "failed") {
        if (result.error) {
          const errMsg =
            typeof result.error === "string"
              ? result.error
              : typeof result.error === "object" &&
                  result.error !== null &&
                  "message" in result.error
                ? (result.error as { message: string }).message
                : JSON.stringify(result.error);
          throw new PepkioAPIError(errMsg, {
            status: 200,
            statusCode: 200,
            body: result,
            runId,
          });
        }
        return result;
      }
      await sleep(intervalMs);
    }

    throw new PepkioAPIError(`Timed out waiting for run ${runId}`, {
      status: 408,
      statusCode: 408,
      runId,
    });
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    opts: { requireAuth?: boolean } = {},
  ): Promise<T> {
    const requireAuth = opts.requireAuth ?? false;
    if (requireAuth && !this.apiKey) {
      throw new PepkioAPIError(
        "API key required. Set PEPKIO_API_KEY (or LOCAL_PEPKIO_API_KEY for local dev).",
        { status: 401, statusCode: 401 },
      );
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const url = apiPath(this.baseUrl, path);
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let parsed: unknown;
    const text = await response.text();
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = text;
    }

    if (!response.ok) {
      let message = `HTTP ${response.status}: ${response.statusText}`;
      let code: string | undefined;
      if (typeof parsed === "object" && parsed !== null && "error" in parsed) {
        const errVal = (parsed as { error: unknown }).error;
        if (typeof errVal === "string") {
          message = errVal;
        } else if (typeof errVal === "object" && errVal !== null) {
          if (
            "message" in errVal &&
            typeof (errVal as { message: unknown }).message === "string"
          ) {
            message = (errVal as { message: string }).message;
          }
          if (
            "code" in errVal &&
            typeof (errVal as { code: unknown }).code === "string"
          ) {
            code = (errVal as { code: string }).code;
          }
        }
      }
      throw new PepkioAPIError(message, {
        status: response.status,
        statusCode: response.status,
        body: parsed,
        code,
      });
    }

    const runResult = parsed as RunResult<KgSingleCellLongReadRnaSequencingResult>;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "error" in parsed &&
      runResult.error
    ) {
      const errMsg =
        typeof runResult.error === "string"
          ? runResult.error
          : typeof runResult.error === "object" &&
              runResult.error !== null &&
              "message" in runResult.error
            ? (runResult.error as { message: string }).message
            : JSON.stringify(runResult.error);
      throw new PepkioAPIError(errMsg, {
        status: response.status,
        statusCode: response.status,
        body: parsed,
        runId: runResult.run_id,
      });
    }

    return parsed as T;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
