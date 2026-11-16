#!/usr/bin/env node
// SPDX-License-Identifier: MIT
import { Command } from "commander";
import fs from "node:fs";
import { PepkioClient } from "./client.js";
import { KnowledgeExplorer } from "./explorer.js";
import { type Difficulty, type ExportFormat, type QueryType } from "./schemas.js";
import { PepkioAPIError } from "./types.js";

const program = new Command();

program
  .name("pepkio-kg-single-cell-long-read-rna-sequencing")
  .description(
    "CLI for the Pepkio Single-Cell Long-Read RNA Sequencing Knowledge Explorer (REST API client & local datasets)",
  )
  .option(
    "--base-url <url>",
    "API base URL (default: PEPKIO_API_BASE_URL or production)",
  )
  .option(
    "--api-key <key>",
    "API key (default: PEPKIO_API_KEY or LOCAL_PEPKIO_API_KEY)",
  );

program
  .command("manifest")
  .description("Fetch and print the tool manifest")
  .option("--examples", "List example names and descriptions only")
  .action(async (_opts, cmd) => {
    const globalOpts = cmd.parent?.opts() ?? {};
    try {
      const client = new PepkioClient({
        baseUrl: globalOpts.baseUrl,
        apiKey: globalOpts.apiKey,
      });
      const manifest = await client.getManifest();
      if (_opts.examples) {
        const examples = client.listExamples(manifest);
        for (const ex of examples) {
          console.log(`${ex.name}\t${ex.description ?? ""}`);
        }
      } else {
        console.log(JSON.stringify(manifest, null, 2));
      }
    } catch (err) {
      printError(err);
    }
  });

program
  .command("run")
  .description("Run the tool with example input, CLI flags, or custom JSON")
  .option(
    "--example <name>",
    "Run a named manifest example (e.g. export_benchmark_tools, export_benchmark_csv, query_summary, query_tools)",
  )
  .option(
    "--action <action>",
    "Action to perform: info, export_benchmark, filter_benchmark, or query",
  )
  .option(
    "--category <category>",
    "Category filter (e.g. Benchmarking, Tools, Methods, Concepts, Platforms)",
  )
  .option(
    "--difficulty <difficulty>",
    "Difficulty filter (beginner, intermediate, advanced)",
  )
  .option("--format <format>", "Export format: json or csv")
  .option(
    "--type <type>",
    "Query entity type: papers, concepts, tools, relationships, or benchmark",
  )
  .option("--query <query>", "Search query string")
  .option("--limit <number>", "Maximum results to return")
  .option("--input-json <json>", "Run with custom input JSON string")
  .option("--input-file <path>", "Run with input JSON loaded from a file")
  .option("-o, --output <path>", "Optional file path to save output content")
  .option("--label <label>", "Optional run label")
  .option("--idempotency-key <key>", "Optional idempotency key")
  .action(async (opts, cmd) => {
    const globalOpts = cmd.parent?.opts() ?? {};

    if (
      (opts.example && (opts.inputJson || opts.inputFile)) ||
      (opts.inputJson && opts.inputFile)
    ) {
      console.error("Provide at most one of --example, --input-json, or --input-file");
      process.exit(1);
    }

    try {
      const client = new PepkioClient({
        baseUrl: globalOpts.baseUrl,
        apiKey: globalOpts.apiKey,
      });

      let input;
      if (opts.example) {
        input = await client.getExampleInput(opts.example);
      } else if (opts.inputJson) {
        input = JSON.parse(opts.inputJson);
      } else if (opts.inputFile) {
        const content = fs.readFileSync(opts.inputFile, "utf8");
        input = JSON.parse(content);
      } else {
        input = {
          action: opts.action ?? "info",
          category: opts.category,
          difficulty: opts.difficulty as Difficulty | undefined,
          format: (opts.format as ExportFormat | undefined) ?? "json",
          type: opts.type as QueryType | undefined,
          query: opts.query,
          limit: opts.limit ? Number(opts.limit) : undefined,
        };
      }

      const runOpts: { label?: string; idempotency_key?: string } = {};
      if (opts.label) runOpts.label = opts.label;
      if (opts.idempotencyKey) runOpts.idempotency_key = opts.idempotencyKey;

      const result = await client.run(
        input,
        Object.keys(runOpts).length > 0 ? runOpts : undefined,
      );

      if (opts.output && result.result?.content) {
        fs.writeFileSync(opts.output, result.result.content, "utf8");
        console.log(`Saved output to ${opts.output}`);
      } else {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (err) {
      printError(err);
    }
  });

program
  .command("info")
  .description("Print metadata, version, paper count, and benchmark question counts")
  .action(() => {
    const explorer = KnowledgeExplorer.load();
    const meta = explorer.meta;
    console.log(`Title: ${meta.title ?? "N/A"}`);
    console.log(`Version: ${meta.version ?? "N/A"}`);
    console.log(`Papers: ${explorer.papers.length}`);
    console.log(`Concepts: ${explorer.concepts.length}`);
    console.log(`Tools: ${explorer.tools.length}`);
    console.log(`Relationships: ${explorer.relationships.length}`);
    console.log(`Benchmark questions: ${explorer.benchmark.length}`);
  });

const benchmarkCmd = program.command("benchmark").description("Benchmark Q&A operations");

benchmarkCmd
  .command("export")
  .description("Export filtered benchmark Q&A to JSON or CSV file")
  .requiredOption("-o, --output <path>", "Output file path")
  .option("--format <format>", "Export format: json or csv", "json")
  .option("--category <category>", "Filter by category")
  .option("--difficulty <difficulty>", "Filter by difficulty")
  .option("--query <query>", "Search query")
  .action((opts) => {
    const explorer = KnowledgeExplorer.load();
    const res = explorer.exportBenchmark({
      format: opts.format as ExportFormat,
      category: opts.category,
      difficulty: opts.difficulty,
      query: opts.query,
    });
    fs.writeFileSync(opts.output, res.content, "utf8");
    console.log(`Exported ${res.count} benchmark entries to ${opts.output}`);
  });

program
  .command("get-run <runId>")
  .description("Fetch result of a previous run by run ID")
  .action(async (runId: string, _opts, cmd) => {
    const globalOpts = cmd.parent?.opts() ?? {};
    try {
      const client = new PepkioClient({
        baseUrl: globalOpts.baseUrl,
        apiKey: globalOpts.apiKey,
      });
      const result = await client.getRun(runId);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      printError(err);
    }
  });

program
  .command("wait-for-run <runId>")
  .description("Poll until a run completes and print the result")
  .option("--interval <ms>", "Polling interval in milliseconds", "1000")
  .option("--timeout <ms>", "Polling timeout in milliseconds", "30000")
  .action(async (runId: string, opts, cmd) => {
    const globalOpts = cmd.parent?.opts() ?? {};
    try {
      const client = new PepkioClient({
        baseUrl: globalOpts.baseUrl,
        apiKey: globalOpts.apiKey,
      });
      const result = await client.waitForRun(runId, {
        intervalMs: Number(opts.interval),
        timeoutMs: Number(opts.timeout),
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      printError(err);
    }
  });

function printError(err: unknown): never {
  if (err instanceof PepkioAPIError) {
    console.error(`API Error (${err.status}): ${err.message}`);
    if (err.body) {
      console.error(JSON.stringify(err.body, null, 2));
    }
  } else if (err instanceof Error) {
    console.error(`Error: ${err.message}`);
  } else {
    console.error("Unknown error:", err);
  }
  process.exit(1);
}

program.parse();
