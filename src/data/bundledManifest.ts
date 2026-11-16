// SPDX-License-Identifier: MIT
import type { ToolManifest } from "../types.js";

export const BUNDLED_MANIFEST: ToolManifest = {
  schema_version: "1.0",
  tool_id: "kg-single-cell-long-read-rna-sequencing",
  title: "Single-Cell Long-Read RNA Sequencing Knowledge Explorer",
  description:
    "Programmatic query, benchmark Q&A export, and knowledge graph exploration for single-cell long-read RNA sequencing (scLR-seq), isoform analysis, and bioinformatics benchmarks.",
  tags: [
    "single-cell",
    "long-read",
    "rna-sequencing",
    "sclr-seq",
    "isoform-analysis",
    "nanopore",
    "pacbio",
    "knowledge-graph",
    "benchmark",
  ],
  category: "stats-bioinformatics",
  execution_mode: "sync",
  estimated_runtime_sec: 1,
  examples: [
    {
      name: "export_benchmark_tools",
      description: "Export Tools category benchmark questions in JSON format",
      input: {
        action: "export_benchmark",
        category: "Tools",
        format: "json",
      },
      output: {
        exported_count: 7,
      },
    },
    {
      name: "export_benchmark_csv",
      description: "Export beginner benchmark questions as CSV",
      input: {
        action: "export_benchmark",
        difficulty: "beginner",
        format: "csv",
      },
      output: {
        format: "csv",
      },
    },
    {
      name: "query_summary",
      description: "Get summary metadata and counts of knowledge graph entities",
      input: {
        action: "info",
      },
      output: {
        summary: {
          papers_count: 7,
          concepts_count: 46,
          tools_count: 72,
          relationships_count: 147,
          benchmark_count: 34,
        },
      },
    },
    {
      name: "query_tools",
      description: "Query tool catalog from the curated knowledge graph",
      input: {
        action: "query",
        type: "tools",
      },
      output: {
        tools: [],
      },
    },
  ],
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["info", "export_benchmark", "filter_benchmark", "query"],
        default: "info",
      },
      category: {
        type: "string",
        description: "Benchmark category filter: Benchmarking, Tools, Methods, Concepts, Platforms",
      },
      difficulty: {
        type: "string",
        enum: ["beginner", "intermediate", "advanced"],
      },
      format: {
        type: "string",
        enum: ["json", "csv"],
        default: "json",
      },
      type: {
        type: "string",
        enum: ["papers", "concepts", "tools", "relationships", "benchmark"],
      },
      query: {
        type: "string",
        description: "Free-text search query across questions, names, or titles",
      },
    },
  },
};
