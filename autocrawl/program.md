# autocrawl

한국 이커머스 범용 크롤러. autoresearch 패턴으로 추출 로직을 자동 최적화.

## 구조

```
program.md    ← 이 파일. 사람이 쓰는 지시서 (읽기 전용)
crawler.ts    ← AI가 수정하는 추출 코드 (mutable)
evaluate.ts   ← 필드 커버리지 채점 (읽기 전용)
schema.ts     ← 제품 스키마 정의 (읽기 전용)
run.ts        ← 파이프라인 오케스트레이션 (읽기 전용)
docker/       ← CDP + Lightpanda + Xvfb 환경
```

## 세팅

새 실험을 시작할 때:

1. **실험 태그 합의**: 오늘 날짜 기반 태그 제안 (예: `mar27`). `autocrawl/<tag>` 브랜치가 이미 있으면 안 됨.
2. **브랜치 생성**: `git checkout -b autocrawl/<tag>` (현재 main에서)
3. **컨텍스트 읽기**: 아래 파일을 반드시 읽어라:
   - `program.md` — 이 지시서
   - `schema.ts` — 제품 스키마 정의. 수정하지 마라.
   - `evaluate.ts` — 평가 로직. 수정하지 마라.
   - `run.ts` — 파이프라인. 수정하지 마라.
   - `crawler.ts` — 네가 수정하는 파일.
4. **Docker 확인**: `docker compose up -d` 로 CDP 서버가 떠 있는지 확인. 안 떠 있으면 사람에게 알려라.
5. **URL 확인**: `urls.txt`에 테스트 URL이 있는지 확인.
6. **확인 후 시작**: 셋업이 정상인지 확인하고 실험 시작.

## 규칙

**수정할 수 있는 것:**
- `crawler.ts` — 이것만 수정한다. 추출 전략, 셀렉터, 파싱 로직, LLM 호출 등 모든 것이 허용됨.

**수정할 수 없는 것:**
- `evaluate.ts` — 평가 기준은 고정. 필드 커버리지가 유일한 메트릭.
- `schema.ts` — 스키마는 고정. 필드를 추가/삭제하지 마라.
- `run.ts` — CDP 연결, 파이프라인 흐름은 고정.
- `package.json` — 새 패키지를 설치하지 마라. 있는 것만 써라.

**목표: avg_coverage를 최대화하라.** 모든 타겟 플랫폼에서 가능한 많은 필드를 채우는 것.

**단순함 기준**: 동일한 결과라면 단순한 코드가 낫다. 커버리지 1% 올리려고 복잡한 코드 50줄 추가? 아마 안 할 가치. 코드 삭제하고 동일 커버리지? 반드시 keep. 단순화는 그 자체로 승리.

**첫 실행**: 반드시 현재 코드 그대로 실행해서 베이스라인을 기록하라.

## 타겟 플랫폼

범용 추출 로직 하나로 전부 커버하는 것이 목표:

- **패션 버티컬**: 무신사, W컨셉, 에이블리, 지그재그
- **리셀/럭셔리**: KREAM, Fruits Family
- **중고**: 번개장터, 당근마켓, 중고나라
- **마켓플레이스**: 쿠팡, 11번가, G마켓, SSG, 네이버 스마트스토어
- **브랜드몰**: 아디다스, Zara 등
- **자사몰 플랫폼**: Cafe24, Sixshop, 아임웹 + 커스텀

## 평가 기준

필드 커버리지 = 비어있지 않은 필드 수 / 전체 필드 수

ground truth 값 비교 없음. "얼마나 완전하게 추출했는가"만 측정.

## 추출 전략

1단계: DOM 기반 구조화 추출 (셀렉터, JSON-LD, Open Graph, meta)
2단계: LLM이 DOM에서 놓친 필드 보완

## 출력 포맷

`evaluate.ts` 실행 후 아래 형태로 출력됨:

```
---
total_urls:         10
avg_coverage:       35.0%
avg_required:       80.0%

field_coverage:
  title                100%
  brand                30%
  ...

worst_fields:
  shipping_info        0%
  reviews              10%
```

핵심 메트릭 추출:

```
grep "^avg_coverage:" run.log
```

## 로깅

`evaluate.ts`가 실행될 때마다 자동으로 append:

- `results.tsv` — 실험별 한 줄 요약 (사람이 훑어보는 용도, git에 안 넣음)
- `results.jsonl` — 실험별 상세 기록 (필드별 커버리지, URL별 결과)
- `run.log` — 마지막 실행의 stdout/stderr

TSV 포맷 (탭 구분, 콤마 쓰지 마라):

```
commit	avg_coverage	avg_required	urls	status	description	timestamp
a1b2c3d	35.0	80.0	10	keep	baseline	2026-03-27T...
b2c3d4e	42.5	80.0	10	keep	add DOM price selectors	2026-03-27T...
c3d4e5f	40.0	60.0	10	discard	try regex extraction	2026-03-27T...
d4e5f6g	0.0	0.0	0	crash	broken import path	2026-03-27T...
```

## 실험 루프

실험은 전용 브랜치에서 돌린다 (예: `autocrawl/mar27`).

LOOP FOREVER:

1. git 상태 확인: 현재 브랜치/커밋
2. `crawler.ts`에 실험적 아이디어를 반영
3. `git commit -m "설명"`
4. `npx tsx run.ts > run.log 2>&1` (stdout을 절대 context에 흘리지 마라)
5. `npx tsx evaluate.ts` → 점수 출력 + results.tsv/jsonl 자동 기록
6. `grep "^avg_coverage:" run.log` 로 결과 확인
7. 크래시인 경우: `tail -n 50 run.log` 로 에러 확인. 사소한 버그면 고치고 재실행. 근본적 문제면 포기하고 다음으로.
8. results.tsv의 마지막 행 status를 keep/discard/crash로 갱신
9. avg_coverage가 올랐으면 keep — 브랜치 전진, 커밋 유지
10. avg_coverage가 같거나 내렸으면 discard — `git reset --hard HEAD~1`로 되돌림

자율적으로 아이디어를 내고 실험하라. 잘 되면 keep, 안 되면 discard. 막히면 rewind할 수 있지만 극히 드물게.

**타임아웃**: 크롤링은 URL당 최대 5분. 전체 실행이 30분을 넘기면 실패 처리 (discard + revert).

**크래시**: 판단하라. 오타나 임포트 에러 같은 사소한 문제면 고쳐서 재실행. 아이디어 자체가 근본적으로 안 되는 거면 skip, status=crash 기록하고 다음으로.

## 절대 멈추지 마라

실험 루프가 시작되면 사람에게 묻지 말고 계속 돌려라. "계속할까요?" 같은 질문 금지. 사람은 자고 있을 수 있다. 아이디어가 없으면 더 생각해라 — 다른 플랫폼의 HTML 구조를 분석하거나, 이전에 근소하게 실패한 접근을 조합하거나, 더 과감한 추출 전략을 시도해라. 수동 중단될 때까지 무한 반복.
