// SPDX-License-Identifier: MIT
import { z } from "zod";

export const actionSchema = z.enum([
  "info",
  "export_benchmark",
  "filter_benchmark",
  "query",
]);
export type Action = z.infer<typeof actionSchema>;

export const difficultySchema = z.enum(["beginner", "intermediate", "advanced"]);
export type Difficulty = z.infer<typeof difficultySchema>;

export const exportFormatSchema = z.enum(["json", "csv"]);
export type ExportFormat = z.infer<typeof exportFormatSchema>;

export const queryTypeSchema = z.enum([
  "papers",
  "concepts",
  "tools",
  "relationships",
  "benchmark",
]);
export type QueryType = z.infer<typeof queryTypeSchema>;

export const kgSingleCellLongReadRnaSequencingInputSchema = z
  .object({
    action: actionSchema.default("info"),
    category: z.string().optional(),
    difficulty: difficultySchema.optional(),
    format: exportFormatSchema.default("json"),
    type: queryTypeSchema.optional(),
    query: z.string().optional(),
    limit: z.number().int().positive().optional(),
  })
  .passthrough();

export type KgSingleCellLongReadRnaSequencingInput = z.infer<
  typeof kgSingleCellLongReadRnaSequencingInputSchema
>;

export function parseRunInput(input: unknown): KgSingleCellLongReadRnaSequencingInput {
  return kgSingleCellLongReadRnaSequencingInputSchema.parse(input ?? {});
}
