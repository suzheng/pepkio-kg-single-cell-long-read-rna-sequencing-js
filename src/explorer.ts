// SPDX-License-Identifier: MIT
import knowledgeData from "./data/knowledge.json";
import type {
  BenchmarkEntry,
  ExportFormat,
  KnowledgeConcept,
  KnowledgeMeta,
  KnowledgePaper,
  KnowledgeRelationship,
  KnowledgeTool,
  KgSingleCellLongReadRnaSequencingInput,
  KgSingleCellLongReadRnaSequencingResult,
} from "./types.js";

export interface KnowledgeGraphData {
  meta: KnowledgeMeta;
  papers: KnowledgePaper[];
  concepts: KnowledgeConcept[];
  tools: KnowledgeTool[];
  relationships: KnowledgeRelationship[];
  benchmark: BenchmarkEntry[];
  [key: string]: unknown;
}

export class KnowledgeExplorer {
  private readonly data: KnowledgeGraphData;

  constructor(data?: KnowledgeGraphData) {
    this.data = (data ?? knowledgeData) as KnowledgeGraphData;
  }

  static load(): KnowledgeExplorer {
    return new KnowledgeExplorer();
  }

  get meta(): KnowledgeMeta {
    return this.data.meta;
  }

  get papers(): KnowledgePaper[] {
    return this.data.papers ?? [];
  }

  get concepts(): KnowledgeConcept[] {
    return this.data.concepts ?? [];
  }

  get tools(): KnowledgeTool[] {
    return this.data.tools ?? [];
  }

  get relationships(): KnowledgeRelationship[] {
    return this.data.relationships ?? [];
  }

  get benchmark(): BenchmarkEntry[] {
    return this.data.benchmark ?? [];
  }

  filterBenchmark(opts: {
    category?: string;
    difficulty?: string;
    query?: string;
  } = {}): BenchmarkEntry[] {
    let items = [...this.benchmark];

    if (opts.category) {
      const catLower = opts.category.toLowerCase();
      items = items.filter((b) => b.category.toLowerCase() === catLower);
    }

    if (opts.difficulty) {
      const diffLower = opts.difficulty.toLowerCase();
      items = items.filter((b) => b.difficulty.toLowerCase() === diffLower);
    }

    if (opts.query) {
      const q = opts.query.toLowerCase();
      items = items.filter(
        (b) =>
          b.question.toLowerCase().includes(q) ||
          b.ground_truth_answer.toLowerCase().includes(q),
      );
    }

    return items;
  }

  exportBenchmark(opts: {
    category?: string;
    difficulty?: string;
    format?: ExportFormat;
    query?: string;
  } = {}): { content: string; format: ExportFormat; count: number; entries: BenchmarkEntry[] } {
    const entries = this.filterBenchmark(opts);
    const format = opts.format ?? "json";

    if (format === "csv") {
      const csv = this.benchmarkToCsv(entries);
      return { content: csv, format: "csv", count: entries.length, entries };
    }

    const json = JSON.stringify(
      {
        meta: {
          title: this.meta.title,
          version: this.meta.version,
          exported_count: entries.length,
        },
        benchmark: entries,
      },
      null,
      2,
    );
    return { content: json, format: "json", count: entries.length, entries };
  }

  private benchmarkToCsv(entries: BenchmarkEntry[]): string {
    const headers = [
      "id",
      "source_paper_id",
      "category",
      "difficulty",
      "question",
      "ground_truth_answer",
    ];
    const rows = entries.map((e) =>
      [
        csvEscape(e.id),
        csvEscape(e.source_paper_id ?? ""),
        csvEscape(e.category),
        csvEscape(e.difficulty),
        csvEscape(e.question),
        csvEscape(e.ground_truth_answer),
      ].join(","),
    );
    return [headers.join(","), ...rows].join("\n");
  }

  execute(input: KgSingleCellLongReadRnaSequencingInput): KgSingleCellLongReadRnaSequencingResult {
    const action = input.action ?? "info";

    switch (action) {
      case "info": {
        return {
          action: "info",
          meta: this.meta,
          summary: {
            title: this.meta.title,
            version: this.meta.version,
            papers_count: this.papers.length,
            concepts_count: this.concepts.length,
            tools_count: this.tools.length,
            relationships_count: this.relationships.length,
            benchmark_count: this.benchmark.length,
          },
        };
      }

      case "filter_benchmark": {
        const filtered = this.filterBenchmark({
          category: input.category,
          difficulty: input.difficulty,
          query: input.query,
        });
        return {
          action: "filter_benchmark",
          benchmark: filtered,
          exported_count: filtered.length,
        };
      }

      case "export_benchmark": {
        const exported = this.exportBenchmark({
          category: input.category,
          difficulty: input.difficulty,
          format: input.format,
          query: input.query,
        });
        return {
          action: "export_benchmark",
          format: exported.format,
          exported_count: exported.count,
          content: exported.content,
          benchmark: exported.entries,
        };
      }

      case "query": {
        const qType = input.type ?? "tools";
        const limit = input.limit ?? 100;
        switch (qType) {
          case "papers": {
            let res = this.papers;
            if (input.query) {
              const q = input.query.toLowerCase();
              res = res.filter((p) => p.title.toLowerCase().includes(q));
            }
            return { action: "query", papers: res.slice(0, limit) };
          }
          case "concepts": {
            let res = this.concepts;
            if (input.query) {
              const q = input.query.toLowerCase();
              res = res.filter((c) => c.name.toLowerCase().includes(q));
            }
            return { action: "query", concepts: res.slice(0, limit) };
          }
          case "tools": {
            let res = this.tools;
            if (input.query) {
              const q = input.query.toLowerCase();
              res = res.filter((t) => t.name.toLowerCase().includes(q));
            }
            return { action: "query", tools: res.slice(0, limit) };
          }
          case "relationships": {
            return { action: "query", relationships: this.relationships.slice(0, limit) };
          }
          case "benchmark": {
            const filtered = this.filterBenchmark({
              category: input.category,
              difficulty: input.difficulty,
              query: input.query,
            });
            return { action: "query", benchmark: filtered.slice(0, limit) };
          }
        }
      }
    }
  }
}

function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n") || val.includes("\r")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
