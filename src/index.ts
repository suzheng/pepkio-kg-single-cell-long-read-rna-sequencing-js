// SPDX-License-Identifier: MIT

export {
  DEFAULT_API_BASE_URL,
  TOOL_ID,
  apiPath,
  isLocalUrl,
  resolveApiKey,
  resolveBaseUrl,
} from "./config.js";

export { BUNDLED_MANIFEST } from "./data/bundledManifest.js";

export {
  actionSchema,
  difficultySchema,
  exportFormatSchema,
  kgSingleCellLongReadRnaSequencingInputSchema,
  parseRunInput,
  queryTypeSchema,
  type Action,
  type Difficulty,
  type ExportFormat,
  type KgSingleCellLongReadRnaSequencingInput,
  type QueryType,
} from "./schemas.js";

export {
  PepkioAPIError,
  type BenchmarkEntry,
  type ExampleMeta,
  type KnowledgeConcept,
  type KnowledgeMeta,
  type KnowledgePaper,
  type KnowledgeRelationship,
  type KnowledgeTool,
  type KgSingleCellLongReadRnaSequencingResult,
  type ManifestExample,
  type RunOptions,
  type RunResult,
  type RunStatus,
  type ToolManifest,
} from "./types.js";

export { KnowledgeExplorer, type KnowledgeGraphData } from "./explorer.js";

export {
  PepkioClient,
  type PepkioClientOptions,
} from "./client.js";

import { PepkioClient } from "./client.js";
export default PepkioClient;
