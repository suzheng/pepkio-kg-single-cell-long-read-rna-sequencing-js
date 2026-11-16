// SPDX-License-Identifier: MIT
import type {
  Action,
  Difficulty,
  ExportFormat,
  KgSingleCellLongReadRnaSequencingInput,
  QueryType,
} from "./schemas.js";

export type {
  Action,
  Difficulty,
  ExportFormat,
  KgSingleCellLongReadRnaSequencingInput,
  QueryType,
};

export type RunStatus = "queued" | "running" | "completed" | "failed" | (string & {});

export interface RunOptions {
  idempotency_key?: string;
  label?: string;
  [key: string]: unknown;
}

export interface RunResult<T = KgSingleCellLongReadRnaSequencingResult> {
  run_id: string;
  status: RunStatus;
  result?: T;
  error?: string | { message?: string; code?: string; details?: unknown } | null;
  result_url?: string;
  permalink?: string;
  duration_ms?: number;
}

export interface ManifestExample {
  name: string;
  description?: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
}

export interface ToolManifest {
  schema_version: string;
  tool_id: string;
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
  execution_mode?: string;
  estimated_runtime_sec?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  agent_notes?: string;
  example_prompts?: string[];
  examples?: ManifestExample[];
  limits?: Record<string, unknown>;
  input_schema?: Record<string, unknown>;
}

export interface ExampleMeta {
  name: string;
  description?: string;
}

export interface BenchmarkEntry {
  id: string;
  source_paper_id?: string;
  question: string;
  ground_truth_answer: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced" | string;
  [key: string]: unknown;
}

export interface KnowledgePaper {
  id: string;
  title: string;
  authors?: string[];
  year?: number;
  doi?: string;
  journal?: string;
  summary?: string;
  [key: string]: unknown;
}

export interface KnowledgeConcept {
  id: string;
  name: string;
  category?: string;
  definition?: string;
  description?: string;
  [key: string]: unknown;
}

export interface KnowledgeTool {
  id: string;
  name: string;
  description?: string;
  category?: string;
  url?: string;
  platform?: string[];
  [key: string]: unknown;
}

export interface KnowledgeRelationship {
  source: string;
  target: string;
  type: string;
  description?: string;
  [key: string]: unknown;
}

export interface KnowledgeMeta {
  title: string;
  description?: string;
  version?: string;
  lastUpdated?: string;
  paperCount?: number;
  [key: string]: unknown;
}

export interface KgSingleCellLongReadRnaSequencingResult {
  action?: Action;
  meta?: KnowledgeMeta;
  summary?: {
    title?: string;
    version?: string;
    papers_count: number;
    concepts_count: number;
    tools_count: number;
    relationships_count: number;
    benchmark_count: number;
  };
  benchmark?: BenchmarkEntry[];
  exported_count?: number;
  content?: string;
  format?: ExportFormat;
  papers?: KnowledgePaper[];
  concepts?: KnowledgeConcept[];
  tools?: KnowledgeTool[];
  relationships?: KnowledgeRelationship[];
  [key: string]: unknown;
}

export class PepkioAPIError extends Error {
  readonly status: number;
  readonly statusCode: number;
  readonly body?: unknown;
  readonly runId?: string;
  readonly code?: string;

  constructor(
    message: string,
    opts: { status?: number; statusCode?: number; body?: unknown; runId?: string; code?: string },
  ) {
    super(message);
    this.name = "PepkioAPIError";
    const st = opts.status ?? opts.statusCode ?? 500;
    this.status = st;
    this.statusCode = st;
    this.body = opts.body;
    this.runId = opts.runId;
    this.code = opts.code;
  }
}
