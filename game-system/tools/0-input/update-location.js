/**
 * 기존 게임 위치 변경 CLI
 * 사용법: node game-system/tools/0-input/update-location.js "게임명"
 *        또는: npm run update-location -- "게임명"
 *
 * xlsx 위치 컬럼만 수정 후 master / output 재빌드.
 * BGG ID, 번역, 추천인원, 체감난이도는 변경하지 않음.
 */

const ExcelJS = require('exceljs');
const readline = require('readline');
const { execSync } = require('child_process');
const path = require('path');

const { readXlsxNormalized } = require('./from-file/import-from-xlsx');
const { COTTAGE_OWNED_GAMES_XLSX_PATH } = require('../_core/paths');

const args = process.argv.slice(2);
const gameNameArg = args.find(a => !a.startsWith('--'));

if (!gameNameArg) {
  console.error('❌ 게임명을 입력해주세요.');
  console.error('   예: npm run update-location -- "스플렌더"');
  process.exit(1);
}

const root = path.resolve(__dirname, '../../..');

function runCmd(label, cmd) {
  console.log(`\n▶ ${label}...`);
  execSync(cmd, { cwd: root, stdio: 'inherit' });
  console.log(`✅ ${label} 완료`);
}

function prompt(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function isSimilar(a, b) {
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  return la !== lb && (la.includes(lb) || lb.includes(la));
}

function findHeaderInfo(worksheet) {
  for (let rn = 1; rn <= Math.min(worksheet.rowCount, 10); rn++) {
    const row = worksheet.getRow(rn);
    let found = false;
    row.eachCell(cell => {
      if (String(cell.value || '').trim() === '보유게임명') found = true;
    });
    if (found) {
      const headerMap = {};
      row.eachCell((cell, colNum) => {
        const h = String(cell.value || '').trim();
        if (h) headerMap[h] = colNum;
      });
      return { headerRowNum: rn, headerMap };
    }
  }
  return null;
}

function findCol(headerMap, candidates) {
  for (const name of candidates) {
    if (headerMap[name] != null) return headerMap[name];
  }
  return null;
}

async function selectLocation(rl, existingLocations, currentLocation) {
  console.log('\n📍 새 위치 선택:');
  existingLocations.forEach((loc, i) => {
    const mark = loc === currentLocation ? ' ← 현재' : '';
    console.log(`  ${i + 1}. ${loc}${mark}`);
  });
  console.log(`  ${existingLocations.length + 1}. 새 위치 직접 입력`);
  console.log(`  0. 위치 없음 (빈칸)`);

  const ans = await prompt(rl, '   번호 선택: ');
  const choice = parseInt(ans.trim(), 10);

  if (choice === 0) return '';

  if (choice >= 1 && choice <= existingLocations.length) {
    return existingLocations[choice - 1];
  }

  if (choice === existingLocations.length + 1) {
    const newLoc = await prompt(rl, '   새 위치 입력: ');
    const trimmed = newLoc.trim();
    if (!trimmed) return currentLocation;

    const similar = existingLocations.find(loc => isSimilar(loc, trimmed));
    if (similar) {
      console.log(`   ⚠️  유사한 기존 위치가 있습니다: "${similar}"`);
      const confirm = await prompt(rl, `   기존 "${similar}" 사용? (Y) / 새 값 "${trimmed}" 유지? (n): `);
      if (confirm.trim().toLowerCase() !== 'n') return similar;
    }

    return trimmed;
  }

  console.log('   유효하지 않은 선택. 변경하지 않습니다.');
  return currentLocation;
}

async function updateLocationInXlsx(ownedName, newLocation) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(COTTAGE_OWNED_GAMES_XLSX_PATH);
  const worksheet = workbook.getWorksheet('보유게임리스트') || workbook.worksheets[0];
  if (!worksheet) throw new Error('시트를 찾을 수 없습니다.');

  const headerInfo = findHeaderInfo(worksheet);
  if (!headerInfo) throw new Error('xlsx 헤더(보유게임명)를 찾을 수 없습니다.');

  const { headerRowNum, headerMap } = headerInfo;
  const nameCol = findCol(headerMap, ['보유게임명', '게임명', 'name', 'name_kr']);
  const locCol  = findCol(headerMap, ['위치', '책장그룹', 'shelf', 'shelfGroupId']);

  if (!nameCol) throw new Error('보유게임명 컬럼을 찾을 수 없습니다.');
  if (!locCol)  throw new Error('위치 컬럼을 찾을 수 없습니다.');

  for (let rn = headerRowNum + 1; rn <= worksheet.rowCount; rn++) {
    const row = worksheet.getRow(rn);
    const cellName = String(row.getCell(nameCol).value || '').trim();
    if (cellName === ownedName) {
      row.getCell(locCol).value = newLocation || null;
      row.commit();
      await workbook.xlsx.writeFile(COTTAGE_OWNED_GAMES_XLSX_PATH);
      return;
    }
  }

  throw new Error(`xlsx에서 "${ownedName}"을 찾을 수 없습니다.`);
}

async function main() {
  const query = gameNameArg.trim();
  console.log(`\n📦 위치 변경: "${query}"\n${'─'.repeat(40)}`);

  // xlsx 전체 읽기
  const { rows } = await readXlsxNormalized(COTTAGE_OWNED_GAMES_XLSX_PATH);

  // 게임 검색: 정확 일치 우선, 없으면 부분 일치
  let exact = rows.filter(r => r.ownedName === query);
  let candidates = exact.length > 0
    ? exact
    : rows.filter(r => r.ownedName.toLowerCase().includes(query.toLowerCase()));

  if (candidates.length === 0) {
    console.error(`❌ "${query}"와 일치하는 게임을 찾지 못했습니다.`);
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    // 후보 선택
    let selected;
    if (candidates.length === 1) {
      selected = candidates[0];
      console.log(`📌 대상 게임: "${selected.ownedName}"`);
    } else {
      console.log(`\n검색 결과 ${candidates.length}개:`);
      candidates.forEach((r, i) => {
        console.log(`  ${i + 1}. "${r.ownedName}"  위치: ${r.shelfGroupId || '(없음)'}`);
      });
      const ans = await prompt(rl, '   번호 선택: ');
      const choice = parseInt(ans.trim(), 10);
      if (choice < 1 || choice > candidates.length) {
        console.log('취소.');
        return;
      }
      selected = candidates[choice - 1];
    }

    const currentLocation = selected.shelfGroupId || '';
    console.log(`\n  현재 위치: ${currentLocation || '(없음)'}`);

    // 기존 위치 목록 추출
    const existingLocations = [
      ...new Set(rows.map(r => r.shelfGroupId).filter(v => v && v.trim()))
    ].sort();

    // 새 위치 선택
    const newLocation = await selectLocation(rl, existingLocations, currentLocation);

    if (newLocation === currentLocation) {
      console.log('\nℹ️  위치가 변경되지 않았습니다. 종료합니다.');
      return;
    }

    // xlsx 수정
    console.log(`\n▶ xlsx 위치 수정: "${currentLocation || '(없음)'}" → "${newLocation || '(없음)'}"`);
    await updateLocationInXlsx(selected.ownedName, newLocation);
    console.log('✅ xlsx 수정 완료');

    // 재빌드
    runCmd('마스터 빌드', 'node game-system/tools/3-build-master/build-master.js');
    runCmd('출력 빌드',   'node game-system/tools/5-build-output/build-output.js');

    // 완료 요약
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`✅ 위치 변경 완료\n`);
    console.log(`  게임명  : ${selected.ownedName}`);
    console.log(`  이전 위치: ${currentLocation || '(없음)'}`);
    console.log(`  새 위치 : ${newLocation || '(없음)'}`);
    console.log('');
  } finally {
    rl.close();
  }
}

main().catch(err => {
  console.error('\n❌ 오류:', err.message || err);
  process.exit(1);
});
