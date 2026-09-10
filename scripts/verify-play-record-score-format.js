// Play Record Display Family 점수 formatter 계약 검사 (DB/브라우저 불필요)
// 사용: node scripts/verify-play-record-score-format.js [--negctl]
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(read('assets/js/play-records-utils.js'), sandbox);
const format = sandbox.window.formatPlayScore;

assert.equal(typeof format, 'function', '공용 formatPlayScore가 노출돼야 한다');
const cases = [
  ['109 / 100 / 97 / 70', '109 / 100 / 97 / 70점'],
  ['109 / 100 / 97 / 70점', '109 / 100 / 97 / 70점'],
  ['109점/100점', '109 / 100점'],
  ['협력승리', '협력승리'],
  ['협력승리 / 무승부', '협력승리 / 무승부'],
  ['', ''],
  [null, ''],
];
for (const [input, expected] of cases) assert.equal(format(input), expected, `${JSON.stringify(input)} score 형식`);

for (const file of ['assets/js/game-reviews.js', 'assets/js/index-page.js']) {
  assert.ok(read(file).includes('formatPlayScore'), `${file}가 공용 formatter를 사용해야 한다`);
}
const sheet = read('assets/js/game-sheet.js');
assert.ok(sheet.includes('function _sheetPlayMetaHtml'), '게임정보 공용 meta helper가 있어야 한다');
assert.ok(sheet.includes('const _scoreTag = _sheetPlayMetaHtml'), '게임정보 플레이기록이 공용 formatter 경로를 써야 한다');
assert.ok(sheet.includes('const _scoreTag2 = _sheetPlayMetaHtml'), '게임별 기록페이지가 공용 formatter 경로를 써야 한다');

if (process.argv.includes('--negctl')) {
  assert.notEqual(format('70'), '70점', '음성 대조군: 숫자 점수 끝단위 판단');
}
console.log('PASS play record score format contract');
