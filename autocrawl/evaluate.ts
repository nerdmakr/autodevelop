/**
 * 필드 커버리지 평가 — 읽기 전용
 *
 * ground truth 비교 없음.
 * 필드가 비어있지 않은지만 체크.
 *
 * 출력:
 * - stdout: 사람이 읽는 요약 (grep 가능)
 * - results.tsv: 실험별 한 줄 요약 (append)
 * - results.jsonl: 실험별 상세 기록 (append)
 */

import { readFileSync, readdirSync, appendFileSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { ProductData, PRODUCT_FIELDS, REQUIRED_FIELDS } from "./schema.ts";

const RESULTS_TSV = "./results.tsv";
const RESULTS_JSONL = "./results.jsonl";

const OUTPUT_DIR = "./output";

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === "number" && value === 0) return true;
  return false;
}

interface FieldScore {
  field: string;
  filled: number;
  total: number;
  rate: number;
}

interface EvalResult {
  url: string;
  coverage: number;
  required_coverage: number;
  filled_fields: string[];
  missing_fields: string[];
}

function evaluateOne(data: Partial<ProductData>): EvalResult {
  const filled: string[] = [];
  const missing: string[] = [];

  for (const field of PRODUCT_FIELDS) {
    if (!isEmpty(data[field as keyof ProductData])) {
      filled.push(field);
    } else {
      missing.push(field);
    }
  }

  const requiredFilled = REQUIRED_FIELDS.filter(
    (f) => !isEmpty(data[f as keyof ProductData])
  );

  return {
    url: data.url ?? "unknown",
    coverage: filled.length / PRODUCT_FIELDS.length,
    required_coverage: requiredFilled.length / REQUIRED_FIELDS.length,
    filled_fields: filled,
    missing_fields: missing,
  };
}

// --- main ---

const files = readdirSync(OUTPUT_DIR).filter((f) => f.endsWith(".json"));

if (files.length === 0) {
  console.log("No output files found.");
  process.exit(1);
}

const results: EvalResult[] = [];
const fieldStats = new Map<string, { filled: number; total: number }>();

for (const field of PRODUCT_FIELDS) {
  fieldStats.set(field, { filled: 0, total: 0 });
}

for (const file of files) {
  const raw = readFileSync(join(OUTPUT_DIR, file), "utf-8");
  const data: Partial<ProductData> = JSON.parse(raw);
  const result = evaluateOne(data);
  results.push(result);

  for (const field of PRODUCT_FIELDS) {
    const stat = fieldStats.get(field)!;
    stat.total++;
    if (result.filled_fields.includes(field)) stat.filled++;
  }
}

// 요약 출력
const avgCoverage =
  results.reduce((s, r) => s + r.coverage, 0) / results.length;
const avgRequired =
  results.reduce((s, r) => s + r.required_coverage, 0) / results.length;

console.log("---");
console.log(`total_urls:         ${results.length}`);
console.log(`avg_coverage:       ${(avgCoverage * 100).toFixed(1)}%`);
console.log(`avg_required:       ${(avgRequired * 100).toFixed(1)}%`);
console.log("");

// 필드별 채움률
console.log("field_coverage:");
for (const [field, stat] of fieldStats) {
  const rate = stat.total > 0 ? (stat.filled / stat.total) * 100 : 0;
  console.log(`  ${field.padEnd(20)} ${rate.toFixed(0)}%`);
}

// 가장 못 채우는 필드
const sorted = [...fieldStats.entries()].sort(
  (a, b) => a[1].filled / a[1].total - b[1].filled / b[1].total
);
console.log("");
console.log("worst_fields:");
for (const [field, stat] of sorted.slice(0, 5)) {
  const rate = stat.total > 0 ? (stat.filled / stat.total) * 100 : 0;
  console.log(`  ${field.padEnd(20)} ${rate.toFixed(0)}%`);
}

// --- 히스토리 기록 ---

function getGitCommit(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

function getGitMessage(): string {
  try {
    return execSync("git log -1 --format=%s", { encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

const commit = getGitCommit();
const message = getGitMessage();
const timestamp = new Date().toISOString();

// results.tsv — 실험별 한 줄 (사람이 훑어보는 용도)
// 헤더 없으면 생성
if (!existsSync(RESULTS_TSV)) {
  appendFileSync(RESULTS_TSV, "commit\tavg_coverage\tavg_required\turls\tstatus\tdescription\ttimestamp\n");
}
appendFileSync(
  RESULTS_TSV,
  `${commit}\t${(avgCoverage * 100).toFixed(1)}\t${(avgRequired * 100).toFixed(1)}\t${results.length}\tpending\t${message}\t${timestamp}\n`
);

// results.jsonl — 실험별 상세 (프로그래밍으로 분석하는 용도)
const detail = {
  commit,
  timestamp,
  description: message,
  summary: {
    total_urls: results.length,
    avg_coverage: avgCoverage,
    avg_required: avgRequired,
  },
  field_coverage: Object.fromEntries(
    [...fieldStats.entries()].map(([f, s]) => [f, s.total > 0 ? s.filled / s.total : 0])
  ),
  per_url: results.map((r) => ({
    url: r.url,
    coverage: r.coverage,
    required_coverage: r.required_coverage,
    missing: r.missing_fields,
  })),
};
appendFileSync(RESULTS_JSONL, JSON.stringify(detail) + "\n");

console.log("");
console.log(`logged: ${commit} → results.tsv, results.jsonl`);
