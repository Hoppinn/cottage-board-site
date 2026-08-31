/*
 * 최근 플레이 → 플레이 기록 iframe 센터모달 UX 계약 검사 (DB 무접속).
 * node scripts/verify-record-modal-ux.js
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const indexPage = read('assets/js/index-page.js');
const reviews = read('assets/js/game-reviews.js');
const css = read('assets/css/style.css');
const page = read('pages/game/game-reviews.html');
let failed = 0;

function check(label, condition) {
  if (condition) console.log(`  PASS ${label}`);
  else { failed += 1; console.error(`  FAIL ${label}`); }
}

console.log('=== 기록 센터모달 UX ===');
check('홈 iframe은 공통 compact 규약 embed=1을 사용',
  indexPage.includes("game-reviews.html?embed=1&tab=input#embed=1&tab=input") && !indexPage.includes('game-reviews.html?embed=true&tab=input'));
check('extensionless redirect가 query를 버려도 header가 hash embed=1을 인식',
  /new URLSearchParams\(location\.hash\.slice\(1\)\)/.test(read('assets/js/header.js')));
check('embed 모드에서 header·breadcrumb·히어로·푸터를 첫 페인트부터 제외',
  /body\.embed-mode \.breadcrumb,[\s\S]*body\.embed-mode \.page-mini-hero,[\s\S]*body\.embed-mode footer/.test(css));
check('embed 모드 탭 자체가 iframe 스크롤 기준 sticky',
  /body\.embed-mode #reviewRoot \.pr-tabs[\s\S]*position:sticky;[\s\S]*top:0;/.test(css));
check('sticky dimensions remain fixed',
  /body\.embed-mode #reviewRoot \.pr-tabs[\s\S]*box-sizing:border-box;[\s\S]*min-height:45px;/.test(css)
  && /body\.embed-mode #reviewRoot \.pr-tab,[\s\S]*body\.is-embedded #reviewRoot \.pr-tab\{box-sizing:border-box;min-height:45px;\}/.test(css));
check('별도 센터모달 탭 헤더를 만들지 않고 기존 탭을 재사용',
  reviews.includes('<div class="pr-tabs">') && !page.includes('record-modal-tabs'));
check('활성 탭 재클릭은 iframe document scroller만 최상단 이동',
  reviews.includes("document.scrollingElement?.scrollTo({ top: 0, behavior: 'smooth' })"));
check('날짜별 최근 실제 데이터 월만 embed에서 기본 OPEN',
  reviews.includes("pr-session--bydate${isEmbeddedRecordHub() && isLatestMonth ? ' is-open' : ''}")
  && reviews.includes("if (!_restoreState && currentView === 'date' && isEmbeddedRecordHub())")
  && reviews.includes("months[0].classList.add('is-open')"));
check('최신 월의 최신 일도 기본 OPEN',
  reviews.includes("pr-sub-session${isLatestDate ? ' is-open' : ''}")
  && reviews.includes('const latestDate = sortedDates[0]?.[0];'));
check('같은 월의 날짜 accordion은 single-open',
  reviews.includes("month.querySelectorAll('.pr-sub-session.is-open')")
  && reviews.includes("el.classList.remove('is-open')"));
check('날짜별 월 클릭은 열린 월을 먼저 모두 닫아 single-open 유지',
  reviews.includes("panel.querySelectorAll('.pr-session--bydate.is-open').forEach(el => el.classList.remove('is-open'))"));
check('기존 다중 월 펼침 상태를 다시 렌더해도 한 달만 복원',
  reviews.includes('const embeddedDateView = currentView === \'date\' && isEmbeddedRecordHub();')
  && reviews.includes('const restoredMonth = [...panel.querySelectorAll(\'.pr-session--bydate\')]'));
check('월 상태 변경은 월 헤더 클릭 바인딩에만 있고 scroll 이벤트가 없음',
  !/addEventListener\(['"]scroll['"]/.test(reviews));
check('독립 페이지의 breadcrumb·히어로 마크업은 보존',
  page.includes('id="pageBreadcrumb"') && page.includes('id="reviewPageHeader"'));
check('기록 입력 렌더와 저장 API 호출 경로 보존',
  reviews.includes('renderInputPanel();') && reviews.includes('window.CottageDB.recordGamePlay'));

if (failed) process.exitCode = 1;
else console.log('\n=== ALL PASS ===');
