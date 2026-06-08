/**
 * 게임 추가 / 위치 변경 / 보정 — 단일 진입점
 * 사용법: npm run add-game -- "게임명"
 * 고급 옵션:
 *   --skip-translate  번역 단계 건너뜀
 *   --rematch         BGG 확인 단계 건너뛰고 바로 재매칭
 */

const { execSync } = require('child_process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

const { readJson, writeJson } = require('../_core/file-read-writer');
const {
  BGG_MATCH_MAP_PATH,
  BGG_GAME_DETAILS_PATH,
  FORCED_BGG_OVERRIDES_PATH,
  COTTAGE_OWNED_GAMES_MASTER_PATH,
  COTTAGE_OWNED_GAMES_XLSX_PATH,
} = require('../_core/paths');
const { readXlsxNormalized } = require('./from-file/import-from-xlsx');
const { addOwnedGame, updateXlsxLocation } = require('./from-name/add-owned-game');
const { autoResolveBggMatches } = require('../1-matcher/b_run-local-match');

const args = process.argv.slice(2);
const gameName = args.find(a => !a.startsWith('--'));
const skipTranslate = args.includes('--skip-translate');
const doRematch = args.includes('--rematch');

if (!gameName) {
  console.error('❌ 게임명을 입력해주세요.');
  console.error('   예: npm run add-game -- "에이다의꿈"');
  console.error('   고급 옵션:');
  console.error('     --skip-translate  번역 건너뜀');
  console.error('     --rematch         BGG 확인 단계 건너뛰고 바로 재매칭');
  process.exit(1);
}

const root = path.resolve(__dirname, '../../..');

// ── 유틸리티 ──────────────────────────────────────────────

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

function isSimilar(a, b) {
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  return la !== lb && (la.includes(lb) || lb.includes(la));
}

function getGameId(name) {
  return String(name || '').trim().replace(/\s+/g, '-');
}

function formatPlayers(arr) {
  if (!arr || arr.length === 0) return '';
  return arr.map(n => `${n}인`).join(', ');
}

function getBggCacheEntry(bggId) {
  if (!bggId) return null;
  const cache = readJson(BGG_GAME_DETAILS_PATH, {});
  return cache[String(bggId)] || null;
}

// 후보 1줄 요약 (캐시 정보 포함)
function formatCandidateLine(c, bggCache) {
  const entry = bggCache[String(c.bggId)];
  const name  = c.bggName || entry?.title || '?';
  const year  = entry?.yearpublished || c.year || '';
  const rating = entry?.average ? ` 평점:${Number(entry.average).toFixed(1)}` : '';
  const minP = entry?.minplayers;
  const maxP = entry?.maxplayers;
  const players = (minP && maxP) ? ` 인원:${minP}~${maxP}인` : '';
  const score = c.score != null ? ` (매칭 ${c.score})` : '';
  return `"${name}"${year ? ` (${year})` : ''}  ID:${c.bggId}${rating}${players}${score}`;
}

// ── 기존 게임 상태 요약 출력 ──────────────────────────────

function showGameSummary(game, bggEntry) {
  const src = bggEntry || {};
  const titleEn = src.title || src.titleEn || game.titleEn || '정보 없음';
  const year    = src.yearpublished || game.yearPublished || '';
  const rating  = src.average ?? game.rating;
  const weight  = src.averageweight ?? game.difficulty;

  let bestPlayers = game.bestPlayers || [];
  let recPlayers  = game.recommendedPlayers || [];
  if (bggEntry?.suggested_numplayers) {
    bestPlayers = bggEntry.suggested_numplayers.best        || bestPlayers;
    recPlayers  = bggEntry.suggested_numplayers.recommended || recPlayers;
  }

  const mechanicsKo  = (game.mechanicsKo  || []).slice(0, 5);
  const categoriesKo = (game.categoriesKo || []).slice(0, 4);

  const descSrc    = game.descriptionKo || src.description || game.description || '';
  const descPreview = descSrc.slice(0, 90) + (descSrc.length > 90 ? '...' : '');
  const hasImage   = Boolean(src.image || game.image || src.thumbnail || game.thumbnail);

  console.log('현재 매칭:');
  console.log(`  BGG ID     : ${game.bggId || '없음'}`);
  console.log(`  BGG 이름   : ${titleEn}${year ? ` (${year})` : ''}`);
  if (rating != null)       console.log(`  평점       : ${Number(rating).toFixed(2)}`);
  if (bestPlayers.length)   console.log(`  베스트     : ${formatPlayers(bestPlayers)}`);
  if (recPlayers.length)    console.log(`  추천 인원  : ${formatPlayers(recPlayers)}`);
  if (weight != null)       console.log(`  체감난이도 : ${Number(weight).toFixed(2)} / 5`);
  if (mechanicsKo.length)   console.log(`  진행       : ${mechanicsKo.join(' · ')}`);
  if (categoriesKo.length)  console.log(`  테마       : ${categoriesKo.join(' · ')}`);
  if (descPreview)          console.log(`  설명       : ${descPreview}`);
  console.log(`  이미지     : ${hasImage ? '있음' : '없음'}`);
  console.log(`  현재 위치  : ${game.location || '(미지정)'}`);
  console.log(`  descriptionKo : ${game.descriptionKo ? '있음' : '없음'}`);
  console.log(`  summaryKo     : ${game.summaryKo     ? '있음' : '없음'}`);
  console.log('');
}

// ── 새 BGG ID 선택 (기존 게임 "틀림" 또는 --rematch) ─────

async function selectNewBggId(rl, gameName) {
  const bggCache  = readJson(BGG_GAME_DETAILS_PATH, {});
  const matchMap  = readJson(BGG_MATCH_MAP_PATH, {});
  const result    = matchMap[gameName];
  const candidates = [];
  if (result?.reviewCandidates?.length) candidates.push(...result.reviewCandidates);
  else if (result?.bestGuess)           candidates.push(result.bestGuess);

  console.log('\n후보 목록:');
  if (candidates.length > 0) {
    candidates.forEach((c, i) => console.log(`  ${i + 1}. ${formatCandidateLine(c, bggCache)}`));
  } else {
    console.log('  (match-map에 후보 없음)');
  }
  console.log(`  ${candidates.length + 1}. 직접 BGG ID 입력`);
  console.log(`  ${candidates.length + 2}. BGG 없음 (skip)`);

  const ans    = await prompt(rl, '   선택: ');
  const choice = parseInt(ans.trim(), 10);

  if (choice >= 1 && choice <= candidates.length) {
    const c = candidates[choice - 1];
    saveForced(gameName, String(c.bggId));
    console.log(`   → ID ${c.bggId} 선택됨`);
    return { bggId: String(c.bggId), needsFetch: true };
  }

  if (choice === candidates.length + 1) {
    const id      = await prompt(rl, '   BGG ID 입력: ');
    const trimmed = id.trim();
    if (trimmed && /^\d+$/.test(trimmed)) {
      saveForced(gameName, trimmed);
      console.log(`   → ID ${trimmed} 저장됨`);
      return { bggId: trimmed, needsFetch: true };
    }
    console.log('   유효하지 않은 ID. skip 처리.');
  }

  saveForced(gameName, 'skip');
  return { bggId: null, needsFetch: false };
}

// ── 신규 게임 BGG 인터랙티브 (매칭 결과 확인) ─────────────

async function resolveBggInteractive(rl, name) {
  const matchMap  = readJson(BGG_MATCH_MAP_PATH, {});
  const bggCache  = readJson(BGG_GAME_DETAILS_PATH, {});
  const result    = matchMap[name];

  if (!result) {
    console.log('\n⚠️  매칭 결과를 찾을 수 없습니다.');
    const id      = await prompt(rl, '   BGG ID 직접 입력 (없으면 Enter로 skip): ');
    const trimmed = id.trim();
    if (trimmed && /^\d+$/.test(trimmed)) { saveForced(name, trimmed); return { needsRebuild: true }; }
    saveForced(name, 'skip');
    return { needsRebuild: false };
  }

  if (result.status === 'forced' || result.status === 'no-bgg') {
    console.log(`\nℹ️  이미 지정된 항목입니다 (${result.status})`);
    return { needsRebuild: false };
  }

  if (result.status === 'auto-confirmed') {
    const { bggId, bggName, score } = result;
    const entry = bggCache[String(bggId)];
    const year  = entry?.yearpublished || '';
    console.log(`\n✅ BGG 자동 확정: "${bggName}"${year ? ` (${year})` : ''}  ID:${bggId}  점수:${score}`);
    const ans = await prompt(rl, '   맞으면 Enter, 틀리면 다른 BGG ID 입력: ');
    const trimmed = ans.trim();
    if (!trimmed) return { needsRebuild: false };
    if (/^\d+$/.test(trimmed)) { saveForced(name, trimmed); return { needsRebuild: true }; }
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
      candidates.forEach((c, i) => console.log(`     ${i + 1}. ${formatCandidateLine(c, bggCache)}`));
    } else if (bestGuess) {
      console.log(`   추정: ${formatCandidateLine(bestGuess, bggCache)}`);
    }
    console.log(`     ${candidates.length + 1}. 직접 BGG ID 입력`);
    console.log(`     ${candidates.length + 2}. BGG 없음 (skip)`);
    const ans    = await prompt(rl, '   선택: ');
    const choice = parseInt(ans.trim(), 10);
    if (choice >= 1 && choice <= candidates.length) {
      saveForced(name, String(candidates[choice - 1].bggId));
      return { needsRebuild: true };
    }
    if (choice === candidates.length + 1) {
      const id = await prompt(rl, '   BGG ID 입력: ');
      const idTrimmed = id.trim();
      if (idTrimmed && /^\d+$/.test(idTrimmed)) { saveForced(name, idTrimmed); return { needsRebuild: true }; }
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
      reviewCandidates.forEach((c, i) => console.log(`     ${i + 1}. ${formatCandidateLine(c, bggCache)}`));
    }
    const ans     = await prompt(rl, '   BGG ID 직접 입력 (없으면 Enter로 skip): ');
    const trimmed = ans.trim();
    if (trimmed && /^\d+$/.test(trimmed)) { saveForced(name, trimmed); return { needsRebuild: true }; }
    saveForced(name, 'skip');
    return { needsRebuild: false };
  }

  return { needsRebuild: false };
}

// ── 위치 선택 ────────────────────────────────────────────

async function selectLocation(rl) {
  const { rows } = await readXlsxNormalized(COTTAGE_OWNED_GAMES_XLSX_PATH);
  const locations = [
    ...new Set(rows.map(r => r.shelfGroupId).filter(v => v && v.trim()))
  ].sort();

  console.log('\n📍 위치 선택:');
  locations.forEach((loc, i) => console.log(`  ${i + 1}. ${loc}`));
  console.log(`  ${locations.length + 1}. 새 위치 직접 입력`);
  console.log(`  0. 위치 없음 (빈칸)`);

  const ans    = await prompt(rl, '   번호 선택: ');
  const choice = parseInt(ans.trim(), 10);

  if (choice === 0) return '';
  if (choice >= 1 && choice <= locations.length) return locations[choice - 1];

  if (choice === locations.length + 1) {
    const newLoc  = await prompt(rl, '   새 위치 입력: ');
    const trimmed = newLoc.trim();
    if (!trimmed) return '';
    const similar = locations.find(loc => isSimilar(loc, trimmed));
    if (similar) {
      console.log(`   ⚠️  유사한 기존 위치: "${similar}"`);
      const confirm = await prompt(rl, `   기존 "${similar}" 사용? (Y) / 새 값 "${trimmed}" 유지? (n): `);
      if (confirm.trim().toLowerCase() !== 'n') return similar;
    }
    return trimmed;
  }

  console.log('   유효하지 않은 선택. 위치 없음으로 처리.');
  return '';
}

// ── 번역 실행 ────────────────────────────────────────────

async function runTranslation(gameId) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('\n⚠️  ANTHROPIC_API_KEY 없음: 번역 미완료 (나중에 npm run translate:desc 로 실행)');
    return false;
  }

  const masterData = readJson(COTTAGE_OWNED_GAMES_MASTER_PATH, { games: {} });
  const game       = masterData.games?.[gameId];

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

  const refreshed     = readJson(COTTAGE_OWNED_GAMES_MASTER_PATH, { games: {} });
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

// ── 메인 ─────────────────────────────────────────────────

async function main() {
  const gameId       = getGameId(gameName);
  const currentMaster = readJson(COTTAGE_OWNED_GAMES_MASTER_PATH, { games: {} });
  const existingGame  = currentMaster.games?.[gameId];
  const isExisting    = Boolean(existingGame);

  const modeLabel = isExisting ? '기존 게임 보정/위치변경' : '신규 게임 추가';
  console.log(`\n🎲 ${modeLabel}: "${gameName}"\n${'─'.repeat(40)}`);
  if (skipTranslate) console.log('ℹ️  --skip-translate: 번역 단계 건너뜀\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    let skipBggFetch          = true;
    let shouldClearTranslation = false;

    if (isExisting) {
      // ── 기존 게임: 요약 확인 → 맞음/틀림 ──────────────────
      const bggEntry = getBggCacheEntry(existingGame.bggId);
      console.log('기존 게임을 찾았습니다.\n');
      showGameSummary(existingGame, bggEntry);

      let doChange = doRematch; // --rematch: 확인 단계 건너뛰고 바로 변경

      if (!doRematch) {
        console.log('현재 BGG 매칭이 맞습니까?');
        console.log('  1) 맞음 — 기존 BGG ID 유지');
        console.log('  2) 틀림 — BGG ID 다시 선택/직접 입력');
        const ans = await prompt(rl, '   선택 [1/2, 기본:1]: ');
        doChange = ans.trim() === '2';
      }

      if (!doChange) {
        console.log('\n기존 BGG 정보가 맞으므로 유지합니다.');
      } else {
        if (doRematch) console.log('\n--rematch: BGG 재매칭을 진행합니다.');
        else           console.log('\n기존 BGG 매칭이 틀려서 수정합니다.');

        console.log('\n▶ BGG 로컬 매칭...');
        await autoResolveBggMatches();
        console.log('✅ BGG 매칭 완료');

        const { needsFetch } = await selectNewBggId(rl, gameName);

        if (needsFetch) {
          console.log('\n▶ BGG 매칭 재계산...');
          await autoResolveBggMatches();
          console.log('✅ 재매칭 완료');
          skipBggFetch = false;

          // 기존 번역이 있으면 유지/재번역 선택
          if (existingGame.descriptionKo || existingGame.summaryKo) {
            console.log('\n기존 번역이 이전 BGG 기준으로 작성되었을 수 있습니다.');
            console.log('  1) 기존 번역 유지');
            console.log('  2) 기존 번역 삭제 후 새 BGG 기준 재번역 (권장)');
            const transAns = await prompt(rl, '   선택 [1/2, 기본:2]: ');
            shouldClearTranslation = transAns.trim() !== '1';
          }
        }
      }
    } else {
      // ── 신규 게임 ────────────────────────────────────────
      skipBggFetch = false;
    }

    // ── 위치 선택 ──────────────────────────────────────────
    let location;
    if (isExisting) {
      const ans = await prompt(rl, '\n📍 위치를 변경하시겠습니까? [y/N]: ');
      if (ans.trim().toLowerCase() === 'y') {
        location = await selectLocation(rl);
      } else {
        location = existingGame.location || '';
        console.log(`   위치 유지: "${location || '(없음)'}"`);
      }
    } else {
      location = await selectLocation(rl);
    }

    // ── xlsx + master 업데이트 ──────────────────────────────
    const locationChanged = location !== (existingGame?.location || '');
    if (!isExisting || locationChanged) {
      console.log(`\n   위치: "${location || '(없음)'}"`);
      console.log('\n▶ 게임 목록 추가/업데이트...');
      await addOwnedGame(gameName, { location });
      console.log('✅ 게임 목록 추가/업데이트 완료');

      const { rows: xlsxRows } = await readXlsxNormalized(COTTAGE_OWNED_GAMES_XLSX_PATH);
      const xlsxGame = xlsxRows.find(r => r.ownedName === gameName);
      const xlsxLoc  = xlsxGame?.shelfGroupId || '(없음)';
      console.log(`   ✔ xlsx 저장 위치: "${xlsxLoc}"`);
      if (location && xlsxLoc !== location) {
        console.warn(`   ⚠️  불일치! 선택="${location}" / xlsx="${xlsxLoc}" → 재저장`);
        await updateXlsxLocation(gameName, location);
      }
    } else {
      console.log('\nℹ️  위치 변경 없음, 게임 목록 업데이트 건너뜀');
    }

    // ── BGG 매칭 + fetch (신규 게임 또는 BGG 변경 시) ──────
    if (!skipBggFetch) {
      if (!isExisting) {
        // 신규 게임: 로컬 매칭 → 인터랙티브 확인
        console.log('\n▶ BGG 로컬 매칭...');
        await autoResolveBggMatches();
        console.log('✅ BGG 매칭 완료');

        const { needsRebuild } = await resolveBggInteractive(rl, gameName);
        if (needsRebuild) {
          console.log('\n▶ BGG 매칭 재계산...');
          await autoResolveBggMatches();
          console.log('✅ 재매칭 완료');
        }
      }
      runCmd('BGG 데이터 fetch', 'node game-system/tools/2-fetcher/a_fetch-bgg-game-data-by-id.js');
    } else {
      console.log('\nℹ️  BGG fetch 건너뜀');
    }

    // ── 번역 초기화 (재번역 선택한 경우, build-master 전에) ─
    if (shouldClearTranslation) {
      const master = readJson(COTTAGE_OWNED_GAMES_MASTER_PATH, { games: {} });
      if (master.games?.[gameId]) {
        master.games[gameId].descriptionKo = null;
        master.games[gameId].summaryKo     = null;
        fs.writeFileSync(COTTAGE_OWNED_GAMES_MASTER_PATH, JSON.stringify(master, null, 2), 'utf8');
        console.log('\n   번역 초기화 완료 (build-master 후 재번역 예정)');
      }
    }

    // ── 빌드 ───────────────────────────────────────────────
    runCmd('마스터 빌드', 'node game-system/tools/3-build-master/build-master.js');
    runCmd('라벨 번역 (mechanics/categories)', 'node game-system/tools/4-label-translator/label-translator.js');

    if (!skipTranslate) {
      await runTranslation(gameId);
    }

    runCmd('출력 빌드', 'node game-system/tools/5-build-output/build-output.js');

    // ── 완료 요약 ──────────────────────────────────────────
    console.log(`\n${'─'.repeat(40)}`);
    const doneLabel = isExisting ? '업데이트' : '추가';
    console.log(`🎉 완료! "${gameName}" ${doneLabel}됨\n`);

    const { rows: finalXlsxRows } = await readXlsxNormalized(COTTAGE_OWNED_GAMES_XLSX_PATH);
    const finalXlsxGame = finalXlsxRows.find(r => r.ownedName === gameName);
    const xlsxFinalLoc  = finalXlsxGame?.shelfGroupId || '(없음)';

    const finalMaster = readJson(COTTAGE_OWNED_GAMES_MASTER_PATH, { games: {} });
    const finalGame   = finalMaster.games?.[gameId];

    if (finalGame) {
      console.log(`  BGG ID         : ${finalGame.bggId ?? '없음'}`);
      console.log(`  위치 (xlsx)    : ${xlsxFinalLoc}`);
      console.log(`  위치 (master)  : ${finalGame.location || '(없음)'}`);
      if (xlsxFinalLoc !== (finalGame.location || '(없음)')) {
        console.warn(`  ⚠️  위치 불일치: xlsx="${xlsxFinalLoc}" / master="${finalGame.location || '(없음)'}"`);
      }
      console.log(`  추천인원       : ${formatPlayers(finalGame.recommendedPlayers)}`);
      console.log(`  최적인원       : ${formatPlayers(finalGame.bestPlayers)}`);
      console.log(`  체감난이도     : ${finalGame.difficulty != null ? `${finalGame.difficulty.toFixed(2)} / 5` : '없음'}`);
      console.log(`  mechanicsKo    : ${finalGame.mechanicsKo?.length  ? finalGame.mechanicsKo.join(', ')  : '없음'}`);
      console.log(`  categoriesKo   : ${finalGame.categoriesKo?.length ? finalGame.categoriesKo.join(', ') : '없음'}`);
      console.log(`  descriptionKo  : ${finalGame.descriptionKo ? '✅' : '❌ 미완료'}`);
      console.log(`  summaryKo      : ${finalGame.summaryKo     ? '✅' : '❌ 미완료'}`);
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
