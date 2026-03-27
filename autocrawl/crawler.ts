/**
 * 범용 제품 추출기 — AI가 수정하는 유일한 파일 (mutable)
 *
 * 여기서부터 시작. 빈 상태가 베이스라인(coverage 0%).
 * 실험 루프에서 이 파일만 수정하며 커버리지를 올려간다.
 *
 * LLM 폴백이 필요하면 GEMINI_API_KEY 환경변수 사용.
 */

import type { ProductData } from "./schema.ts";

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";

export interface CrawlContext {
  url: string;
  html: string;
}

/** 메인 추출 함수 */
export async function extract(ctx: CrawlContext): Promise<Partial<ProductData>> {
  return {
    url: ctx.url,
    crawled_at: new Date().toISOString(),
  };
}
