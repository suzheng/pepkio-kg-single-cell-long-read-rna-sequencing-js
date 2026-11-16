# Pepkio Single-Cell Long-Read RNA Sequencing Knowledge Explorer

TypeScript/ESM client library and CLI to query curated knowledge graphs, export evaluation benchmark Q&A, and inspect single-cell long-read transcriptomics entities via the Pepkio Tools API and bundled offline datasets.

# What It Does

Single-cell long-read RNA sequencing enables full-length isoform identification, alternative splicing resolution, and single-cell transcript quantification. This package provides programmatic Node.js and TypeScript access to the curated scLR-seq knowledge graph, tool registry, and benchmark evaluation suite hosted on the Pepkio Tools REST API.

When working offline or in air-gapped CI environments, the client automatically falls back to bundled datasets (`knowledge.json` and `benchmark.json`), allowing seamless execution without requiring network connectivity or API credentials.

# Features

- Query curated concepts, papers, tools, and relational links across single-cell long-read transcriptomics
- Export ground-truth benchmark Q&A in JSON or CSV with category and difficulty filters
- Dual-mode operation: live Pepkio REST API queries with automatic offline bundled fallback
- Strongly typed TypeScript interfaces with runtime validation via Zod
- Manifest inspection helpers: `getManifest`, `listExamples`, `getExampleInput`
- High-level client methods: `info`, `exportBenchmark`, `filterBenchmark`, `query`
- Command-line interface with `manifest`, `run`, `info`, and `benchmark` subcommands

# Installation

```bash
npm install pepkio-kg-single-cell-long-read-rna-sequencing
```

Requires Node.js 18 or newer.

# Configuration

Set an API key with **tools:run** scope before calling remote endpoints:

```bash
export PEPKIO_API_KEY="your-key"
```

Create a key at [Pepkio API keys](https://www.pepkio.com/account/api-keys). API keys are optional for local/bundled dataset queries.

Optional environment variables:

| Variable | Purpose |
|----------|---------|
| `PEPKIO_API_KEY` | Production API key (for remote API calls) |
| `LOCAL_PEPKIO_API_KEY` | Local development key when `PEPKIO_API_BASE_URL` points to `tools.localtest.me` |
| `PEPKIO_API_BASE_URL` | API base URL (default `https://tools.pepkio.com`) |

# Quick Example

```typescript
import { PepkioClient } from "pepkio-kg-single-cell-long-read-rna-sequencing";

const client = new PepkioClient();

// Query summary metadata and entity counts
const summary = await client.query({ query_type: "summary" });
console.log(summary.result?.summary);

// Export Tools-category benchmark questions
const benchmark = await client.exportBenchmark({
  category: "Tools",
  format: "json",
});
console.log(`Retrieved ${benchmark.result?.questions?.length} benchmark questions`);
```

# CLI

```bash
npx pepkio-kg-single-cell-long-read-rna-sequencing manifest --examples
npx pepkio-kg-single-cell-long-read-rna-sequencing run --example query_summary
npx pepkio-kg-single-cell-long-read-rna-sequencing info
npx pepkio-kg-single-cell-long-read-rna-sequencing benchmark export --category Tools --format json
```

Pass `--base-url` and `--api-key` to override environment defaults.

# Typical Use Cases

- **Benchmarking LLM agents and RAG pipelines** — automated evaluation against curated ground-truth questions in single-cell transcriptomics
- **Knowledge discovery and tool selection** — querying isoform discovery, error correction, and fusion detection tools
- **CI/CD evaluation suites** — offline export of benchmark datasets to test analytical workflows without external dependencies
- **Bioinformatics application integration** — integrating long-read single-cell transcriptomics knowledge into web dashboards and notebooks

# Scientific Background

Single-cell long-read RNA sequencing (scLR-seq) integrates high-throughput third-generation sequencing platforms (such as Pacific Biosciences HiFi and Oxford Nanopore Technologies) with single-cell barcoding (10x Genomics Chromium, MAS-ISO-seq, Kinnex). This resolves full-length isoforms, alternative splicing events, polyadenylation diversity, and allele-specific expression at single-cell resolution. The bundled knowledge graph categorizes tools across read correction, cell demultiplexing, transcript assembly, and quantification, accompanied by 34 verified benchmark questions.

# Web Application

For researchers who prefer a graphical interface, an interactive web version is available.

Web Application: https://www.pepkio.com/tools/kg-single-cell-long-read-rna-sequencing

The web application provides interactive graph visualization, paper citations, tool search filters, and shareable permalinks. The npm package uses the same underlying data and REST API.

# Documentation and Resources

GitHub Repository: https://github.com/pepkio/pepkio-kg-single-cell-long-read-rna-sequencing-js

Web Application: https://www.pepkio.com/tools/kg-single-cell-long-read-rna-sequencing

Docker Hub: https://hub.docker.com/r/pepkio/kg-single-cell-long-read-rna-sequencing

# About Pepkio

Pepkio (https://www.pepkio.com/) develops software tools and bioinformatics solutions for life science researchers, including laboratory calculators and analysis services (https://www.pepkio.com/cro).

A semantic, AI-native version of this document in the K2F format is available at https://k2f.dev (https://k2f.dev/v/4d4b4a13633795f8bea9fe16209f3c2186fd077c276080489b7719fbc29e8be4)
