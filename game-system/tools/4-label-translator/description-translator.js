/**
 * BGG description 영→한 번역기
 * Claude Haiku API로 master.json의 description을 번역 → descriptionKo 필드로 저장
 *
 * 옵션:
 *   --limit N    최대 N개만 번역
 *   --dry-run    번역 대상 목록만 출력, API 호출 안 함
 *
 * 실행: node game-system/tools/4-label-translator/description-translator.js [--limit N] [--dry-run]
 *       또는 npm run translate:desc
 *
 * 환경변수: ANTHROPIC_API_KEY 필수
 */

const Anthropic = require("@anthropic-ai/sdk");
const { readJson, writeJson } = require("../_core/file-read-writer");
const { COTTAGE_OWNED_GAMES_MASTER_PATH } = require("../_core/paths");

const MODEL = "claude-haiku-4-5-20251001";
const SAVE_INTERVAL = 5;   // N개 번역마다 중간 저장
const REQUEST_DELAY = 500; // ms, rate limit 방지

const SYSTEM_PROMPT = `당신은 보드게임 전문 번역가입니다. BGG(보드게임긱) 게임 설명을 한국어로 번역합니다.

규칙:
- 자연스럽고 읽기 쉬운 한국어로 번역한다
- 게임 메카닉/규칙 설명은 정확하게 유지한다
- 원문이 길면 핵심 내용 위주로 요약한다 (최대 400자)
- 번역문만 출력한다 (부가 설명, 메모 없이)`;

const client = new Anthropic();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateOne(description) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `다음 보드게임 설명을 한국어로 번역해줘:\n\n${description}`,
      },
    ],
  });
  return response.content[0].text.trim();
}

async function run() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

  if (!dryRun && !process.env.ANTHROPIC_API_KEY) {
    console.error("오류: ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.");
    process.exit(1);
  }

  const masterData = readJson(COTTAGE_OWNED_GAMES_MASTER_PATH, { games: {} });
  const games = masterData.games || {};

  const pending = Object.values(games).filter(
    (g) => g.description && g.description.trim() && !g.descriptionKo
  );

  const target = limit < Infinity ? pending.slice(0, limit) : pending;

  console.log(`전체 게임: ${Object.keys(games).length}개`);
  console.log(`번역 대상: ${target.length}개 (미번역 전체: ${pending.length}개)`);

  if (dryRun) {
    console.log("\n--dry-run 모드: 번역 대상 목록");
    target.forEach((g, i) => console.log(`  ${i + 1}. [${g.id}] ${g.ownedName}`));
    return;
  }

  let done = 0;
  let errors = 0;

  for (const game of target) {
    try {
      const ko = await translateOne(game.description);
      games[game.id].descriptionKo = ko;
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
  console.log(`\n완료: ${done}개 번역, ${errors}개 오류`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
