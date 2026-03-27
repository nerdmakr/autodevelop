/**
 * 파이프라인 오케스트레이션 — 읽기 전용
 *
 * 1. urls.txt 읽기
 * 2. CDP로 각 URL 렌더링
 * 3. crawler.ts로 추출
 * 4. output/ 에 JSON 저장
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { extract } from "./crawler.ts";

const CDP_ENDPOINT = process.env.CDP_ENDPOINT ?? "http://localhost:9222";
const OUTPUT_DIR = "./output";

async function getPageHtml(url: string): Promise<string> {
  // CDP JSON API로 새 탭 열기
  const res = await fetch(`${CDP_ENDPOINT}/json/new?${encodeURIComponent(url)}`);
  const tab = await res.json();
  const targetId = tab.id;

  // WebSocket으로 CDP 연결
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise<void>((resolve) => ws.addEventListener("open", () => resolve()));

  let reqId = 1;
  const send = (method: string, params: Record<string, unknown> = {}): Promise<any> =>
    new Promise((resolve) => {
      const id = reqId++;
      ws.addEventListener("message", function handler(e) {
        const msg = JSON.parse(String(e.data));
        if (msg.id === id) {
          ws.removeEventListener("message", handler);
          resolve(msg.result);
        }
      });
      ws.send(JSON.stringify({ id, method, params }));
    });

  // 페이지 로드 대기
  await send("Page.enable");
  await new Promise<void>((resolve) => {
    const onLoad = (e: MessageEvent) => {
      const msg = JSON.parse(String(e.data));
      if (msg.method === "Page.loadEventFired") {
        ws.removeEventListener("message", onLoad);
        resolve();
      }
    };
    ws.addEventListener("message", onLoad);
  });

  // 추가 렌더링 대기 (SPA)
  await new Promise((r) => setTimeout(r, 2000));

  // HTML 가져오기
  const { result } = await send("Runtime.evaluate", {
    expression: "document.documentElement.outerHTML",
  });
  const html = result.value as string;

  // 탭 닫기
  ws.close();
  await fetch(`${CDP_ENDPOINT}/json/close/${targetId}`);

  return html;
}

function urlToFilename(url: string): string {
  return url
    .replace(/https?:\/\//, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .slice(0, 100) + ".json";
}

async function main() {
  const urls = readFileSync("./urls.txt", "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`Processing ${urls.length} URLs...`);

  for (const url of urls) {
    try {
      console.log(`  ${url}`);
      const html = await getPageHtml(url);
      const data = await extract({ url, html });
      const filename = urlToFilename(url);
      writeFileSync(join(OUTPUT_DIR, filename), JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`  FAIL: ${url} — ${err}`);
    }
  }

  console.log("Done. Run evaluate: npx tsx evaluate.ts");
}

main();
