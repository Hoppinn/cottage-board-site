/**
 * 새 게임 추가 + BGG 매칭(인터랙티브) + 번역 + 빌드 자동화
 * 사용법: node game-system/tools/0-input/add-game.js "에이다의꿈"
 *        또는: npm run add-game "에이다의꿈"
 * 옵션:  --skip-translate  번역 단계 건너뜀
 */

const { execSync } = require('child_process');
const readline = require('readline');
const path = require('path');

const { readJson, writeJson } = require('../_core/file-read-writer');
const {
  BGG_MATCH_MAP_PATH,
  FORCED_BGG_OVERRIDES_PATH,
  COTTAGE_OWNED_GAMES_MASTER_PATH,
} = require('../_core/paths');
const { addOwnedGame } = require('./from-name/add-owned-game');
const { autoResolveBggMatches } = require('../1-matcher/b_run-local-match');

const args = process.argv.slice(2);
const gameName = args.find(a => !a.startsWith('--'));
const skipTranslate = args.includes('--skip-translate');

if (!gameName) {
  console.error('❌ 게임명을 입력해주세요.');
  console.error('   예: npm run add-game "에이다의꿈"');
  console.error('   옵션: --skip-translate  번역 단계 건너뜀');
  process.exit(1);
}

const root = path.resolve(__dirname, '../../..');

function runCmd(label, cmd) {
  console.log(`\n▶ ${label}...`);
  execSync(cmd, { cwd: root, stdio: 'inherit' });
  console.log(`✅ ${label} 완료`);
}

function runOptional(label, cmd) {
  console.log(`\n▶ ${label}...`);
  try {
    execSync(cmd, { cwd: root, stdio: 'inherit' });
    console.log(`✅ ${label} 완료`);
    return true;
  } catch {
    console.warn(`⚠️  ${label} 실패 (계속 진행)`);
    return false;
  }
}

function prompt(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function saveForced(name, bggIdOrSkip) {
  const overrides = readJson(FORCED_BGG_OVERRIDES_PATH, {});
  overrides[name] = bggIdOrSkip;
  writeJson(FORCED_BGG_OVERRIDES_PATH, overrides);
}

async function resolveBggInteractive(rl, name) {
  const matchMap = readJson(BGG_MATCH_MAP_PATH, {});
  const result = matchMap[name];

  if (!result) {
    console.log('\n⚠️  매칭 결과를 찾을 수 없습니다.');
    const id = await prompt(rl, '   BGG ID 직접 입력 (없으면 Enter로 skip): ');
    const trimmed = id.trim();
    if (trimmed && /^\d+$/.test(trimmed)) {
      saveForced(name, trimmed);
      return { needsRebuild: true };
    }
    saveForced(name, 'skip');
    return { needsRebuild: false };
  }

  if (result.status === 'forced' || result.status === 'no-bgg') {
    console.log(`\nℹ️  이미 지정된 항목입니다 (${result.status})`);
    return { needsRebuild: false };
  }

  if (result.status === 'auto-confirmed') {
    const { bggName, bggId, score } = result;
    console.log(`\n✅ BGG 자동 확정: "${bggName}" (ID: ${bggId}, 점수: ${score})`);
    const ans = await prompt(rl, '   맞으면 Enter, 틀리면 다른 BGG ID 입력: ');
    const trimmed = ans.trim();
    if (!trimmed) return { needsRebuild: false };
    if (/^\d+$/.test(trimmed)) {
      saveForced(name, trimmed);
      return { needsRebuild: true };
    }
    console.log('   유효하지 않은 입력. 자동 확정 유지.');
    return { needsRebuild: false };
  }

  if (result.status === 'needs-review') {
    const { bestGuess, reviewCandidates, flagReason } = result;
    console.log(`\n🟡 BGG 매칭 확인 필요 (점수: ${bestGuess?.score ?? '?'})`);
    if (flagReason) console.log(`   ⚠️  ${flagReason}`);
    const candidates = reviewCandidates || [];
    if (candidates.length > 0) {
      console.log('   후보 목록:');
      candidates.forEach((c, i) => {
        const year = c.year ? ` (${c.year})` : '';
        console.log(`     ${i + 1}. "${c.bggName}"${year}  ID: ${c.bggId}  점수: ${c.score ?? '-'}`);
      });
    } else if (bestGuess) {
      console.log(`   추정: "${bestGuess.bggName}" (ID: ${bestGuess.bggId})`);
    }
    console.log(`     ${candidates.length + 1}. 직접 BGG ID 입력`);
    console.log(`     ${candidates.length + 2}. BGG 없음 (skip)`);

    const ans = await prompt(rl, '   선택: ');
    const choice = parseInt(ans.trim(), 10);
    if (choice >= 1 && choice <= candidates.length) {
      saveForced(name, String(candidates[choice - 1].bggId));
      return { needsRebuild: true };
    }
    if (choice === candidates.length + 1) {
      const id = await prompt(rl, '   BGG ID 입력: ');
      const idTrimmed = id.trim();
      if (idTrimmed && /^\d+$/.test(idTrimmed)) {
        saveForced(name, idTrimmed);
        return { needsRebuild: true };
      }
      console.log('   유효하지 않은 ID. skip 처리.');
    }
    saveForced(name, 'skip');
    return { needsRebuild: false };
  }

  if (result.status === 'unresolved') {
    const { reviewCandidates } = result;
    console.log('\n❓ BGG 매칭 실패 (score < 55)');
    if (reviewCandidates?.length > 0) {
      console.log('   낮은 점수 후보:');
      reviewCandidates.forEach((c, i) => {
        const year = c.year ? ` (${c.year})` : '';
        console.log(`     ${i + 1}. "${c.bggName}"${year}  ID: ${c.bggId}  점수: ${c.score ?? '-'}`);
      });
    }
    const ans = await prompt(rl, '   BGG ID 직접 입력 (없으면 Enter로 skip): ');
    const trimmed = ans.trim();
    if (trimmed && /^\d+$/.test(trimmed)) {
      saveForced(name, trimmed);
      return { needsRebuild: true };
    }
    saveForced(name, 'skip');
    return { needsRebuild: false };
  }

  return { needsRebuild: false };
}

function getGameId(name) {
  return String(name || '').trim().replace(/\s+/g, '-');
}

async function runTranslation(gameId) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('\n⚠️  ANTHROPIC_API_KEY 없음: 번역 미완료 (나중에 npm run translate:desc 로 실행)');
    return false;
  }

  const masterData = readJson(COTTAGE_OWNED_GAMES_MASTER_PATH, { games: {} });
  const game = masterData.games?.[gameId];

  if (!game) {
    console.warn(`\n⚠️  번역 미완료: master에서 "${gameId}" 항목을 찾을 수 없음`);
    return false;
  }

  if (!game.description || !game.description.trim()) {
    console.warn('\n⚠️  번역 미완료: BGG 설명 없음 (bggId 미확정 상태일 수 있음)');
    return false;
  }

  console.log('\n💰 Claude Haiku API로 번역합니다 (API 비용 발생)');

  let didTranslate = false;

  if (!game.descriptionKo) {
    const ok = runOptional(
      '번역 (영→한)',
      `node game-system/tools/4-label-translator/description-translator.js --game-id "${gameId}"`
    );
    if (ok) didTranslate = true;
  } else {
    console.log('\nℹ️  descriptionKo 이미 존재, 번역 건너뜀');
  }

  // summaryKo: 직전 번역으로 descriptionKo가 생성됐거나 이미 있고 summaryKo가 없을 때
  const refreshed = readJson(COTTAGE_OWNED_GAMES_MASTER_PATH, { games: {} });
  const refreshedGame = refreshed.games?.[gameId];
  if (refreshedGame?.descriptionKo && !refreshedGame?.summaryKo) {
    runOptional(
      '요약 생성 (한→요약)',
      `node game-system/tools/4-label-translator/description-translator.js --game-id "${gameId}" --summary`
    );
    didTranslate = true;
  } else if (!refreshedGame?.summaryKo) {
    console.warn('\n⚠️  번역 미완료: summaryKo 생성 불가 (descriptionKo 없음)');
  } else {
    console.log('\nℹ️  summaryKo 이미 존재, 요약 건너뜀');
  }

  return didTranslate;
}

async function main() {
  console.log(`\n🎲 새 게임 추가: "${gameName}"\n${'─'.repeat(40)}`);
  if (skipTranslate) console.log('ℹ️  --skip-translate 옵션: 번역 단계 건너뜀\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    // 1. 위치 / 난이도 입력
    const locationRaw = await prompt(rl, '📍 위치 (예: A선반, 미입력 시 빈칸): ');
    const location = locationRaw.trim();

    const diffRaw = await prompt(rl, '⚖️  체감난이도 0~5 (미입력 시 생략): ');
    const diffNum = parseFloat(diffRaw.trim());
    const difficultyWeight = Number.isFinite(diffNum) ? diffNum : null;

    // 2. xlsx + master에 추가
    console.log('\n▶ 1. 게임 목록 추가...');
    await addOwnedGame(gameName, { location, difficultyWeight });
    console.log('✅ 게임 목록 추가 완료');

    // 3. BGG 로컬 매칭
    console.log('\n▶ 2. BGG 로컬 매칭...');
    await autoResolveBggMatches();
    console.log('✅ BGG 매칭 완료');

    // 4. 매칭 결과 인터랙티브 처리
    const { needsRebuild } = await resolveBggInteractive(rl, gameName);
    if (needsRebuild) {
      console.log('\n▶ BGG 매칭 재계산...');
      await autoResolveBggMatches();
      console.log('✅ 재매칭 완료');
    }

    // 5. BGG 데이터 fetch
    runCmd('3. BGG 데이터 fetch', 'node game-system/tools/2-fetcher/a_fetch-bgg-game-data-by-id.js');

    // 6. Master 빌드
    runCmd('4. 마스터 빌드', 'node game-system/tools/3-build-master/build-master.js');

    // 7. 번역
    const gameId = getGameId(gameName);
    let translationDone = false;
    if (!skipTranslate) {
      translationDone = await runTranslation(gameId);
    }

    // 8. Output 빌드 (번역 후 재빌드 포함)
    runCmd('5. 출력 빌드', 'node game-system/tools/5-build-output/build-output.js');

    console.log(`\n🎉 완료! "${gameName}" 추가됨\n`);

    // 완료 요약
    const finalMaster = readJson(COTTAGE_OWNED_GAMES_MASTER_PATH, { games: {} });
    const finalGame = finalMaster.games?.[gameId];
    if (finalGame) {
      console.log(`  BGG ID     : ${finalGame.bggId ?? '없음'}`);
      console.log(`  위치       : ${finalGame.location || '미입력'}`);
      console.log(`  체감난이도 : ${finalGame.difficultyWeight ?? '미입력'}`);
      console.log(`  descriptionKo : ${finalGame.descriptionKo ? '✅' : '❌ 미완료'}`);
      console.log(`  summaryKo     : ${finalGame.summaryKo ? '✅' : '❌ 미완료'}`);
    }
    console.log('');
  } finally {
    rl.close();
  }
}

main().catch(err => {
  console.error('\n❌ 오류:', err.message || err);
  process.exit(1);
});
