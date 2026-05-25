/**
 * BGG description 영→한 번역 + summaryKo 생성기
 * Claude Haiku API 사용
 *
 * 모드:
 *   (기본)      description 영→한 번역 → descriptionKo 저장
 *   --summary   descriptionKo에서 한 문장 요약 → summaryKo 저장
 *
 * 옵션:
 *   --limit N   최대 N개만 처리
 *   --dry-run   대상 목록만 출력, API 호출 안 함
 *
 * 실행:
 *   npm run translate:desc              (번역)
 *   npm run translate:desc -- --summary (요약)
 *
 * 환경변수: ANTHROPIC_API_KEY 필수
 */

const Anthropic = require("@anthropic-ai/sdk");
const { readJson, writeJson } = require("../_core/file-read-writer");
const { COTTAGE_OWNED_GAMES_MASTER_PATH } = require("../_core/paths");

const MODEL = "claude-haiku-4-5-20251001";
const SAVE_INTERVAL = 5;
const REQUEST_DELAY = 500;

const TRANSLATE_SYSTEM = `당신은 보드게임 전문 번역가입니다. BGG(보드게임긱) 게임 설명을 한국어로 번역합니다.

규칙:
- 자연스럽고 읽기 쉬운 한국어로 번역한다
- 게임 메카닉/규칙 설명은 정확하게 유지한다
- 원문이 길면 핵심 내용 위주로 요약한다 (최대 400자)
- 번역문만 출력한다 (부가 설명, 메모 없이)`;

const SUMMARY_SYSTEM = `당신은 보드게임 큐레이터입니다. 보드게임의 한국어 설명을 읽고 핵심을 한 문장으로 요약합니다.

규칙:
- 반드시 한 문장만 출력한다
- 50자 이내로 간결하게 작성한다
- "~하는 게임" 또는 "~을 겨루는 게임" 형식을 권장한다
- 게임의 핵심 재미나 방식이 드러나야 한다
- 부가 설명, 마침표 외 문장 부호 없이 출력한다`;

const client = new Anthropic();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callApi(systemPrompt, userContent) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userContent }],
  });
  return response.content[0].text.trim();
}

async function run() {
  const args = process.argv.slice(2);
  const dryRun    = args.includes("--dry-run");
  const isSummary = args.includes("--summary");
  const limitIdx  = args.indexOf("--limit");
  const limit     = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

  if (!dryRun && !process.env.ANTHROPIC_API_KEY) {
    console.error("오류: ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.");
    process.exit(1);
  }

  const masterData = readJson(COTTAGE_OWNED_GAMES_MASTER_PATH, { games: {} });
  const games = masterData.games || {};

  let pending;

  if (isSummary) {
    // summaryKo 생성: descriptionKo 있고 summaryKo 없는 게임
    pending = Object.values(games).filter(
      (g) => g.descriptionKo && g.descriptionKo.trim() && !g.summaryKo
    );
    console.log(`[summaryKo 생성 모드]`);
  } else {
    // descriptionKo 번역: description 있고 descriptionKo 없는 게임
    pending = Object.values(games).filter(
      (g) => g.description && g.description.trim() && !g.descriptionKo
    );
    console.log(`[descriptionKo 번역 모드]`);
  }

  const target = limit < Infinity ? pending.slice(0, limit) : pending;

  console.log(`전체 게임: ${Object.keys(games).length}개`);
  console.log(`처리 대상: ${target.length}개 (미처리 전체: ${pending.length}개)`);

  if (dryRun) {
    console.log("\n--dry-run 모드: 처리 대상 목록");
    target.forEach((g, i) => console.log(`  ${i + 1}. [${g.id}] ${g.ownedName}`));
    return;
  }

  let done = 0;
  let errors = 0;

  for (const game of target) {
    try {
      if (isSummary) {
        const summary = await callApi(
          SUMMARY_SYSTEM,
          `다음 보드게임 설명을 한 문장으로 요약해줘:\n\n${game.descriptionKo}`
        );
        games[game.id].summaryKo = summary;
      } else {
        const ko = await callApi(
          TRANSLATE_SYSTEM,
          `다음 보드게임 설명을 한국어로 번역해줘:\n\n${game.description}`
        );
        games[game.id].descriptionKo = ko;
      }

      done++;
      process.stdout.write(`[${done}/${target.length}] ${game.ownedName}\n`);

      if (done % SAVE_INTERVAL === 0) {
        writeJson(COTTAGE_OWNED_GAMES_MASTER_PATH, masterData);
        process.stdout.write(`  → ${done}개 중간 저장\n`);
      }

      if (done < target.length) await sleep(REQUEST_DELAY);
    } catch (err) {
      errors++;
      console.error(`[오류] ${game.ownedName}: ${err.message}`);
    }
  }

  writeJson(COTTAGE_OWNED_GAMES_MASTER_PATH, masterData);
  console.log(`\n완료: ${done}개 처리, ${errors}개 오류`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
