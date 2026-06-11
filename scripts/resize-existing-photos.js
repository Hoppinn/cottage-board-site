/**
 * resize-existing-photos.js
 *
 * Supabase Storage play-photos 버킷의 기존 사진을
 * 1200px(긴 쪽) / JPEG 0.85 로 일괄 리사이즈 후 같은 경로에 덮어쓰기.
 * DB(photo_url) 는 변경하지 않음.
 *
 * 의존성: sharp (npm install sharp)
 *
 * 실행:
 *   node game-system/tools/resize-existing-photos.js
 *   node game-system/tools/resize-existing-photos.js --dry-run   (업로드 없이 목록만)
 *   node game-system/tools/resize-existing-photos.js --limit 10  (최대 10개만 처리)
 */

const { createClient } = require("@supabase/supabase-js");
const https = require("https");
const http = require("http");
const sharp = require("sharp");

const SUPABASE_URL = "https://fqddfvprknwcgojwfrbs.supabase.co";
const SUPABASE_KEY = "sb_publishable_gPxHQyp4fG7l3YBrCVUWJw_2-mBnNpl";
const BUCKET = "play-photos";
const MAX_PX = 1200;
const QUALITY = 85; // sharp는 0~100 정수

const isDryRun = process.argv.includes("--dry-run");
const limitIdx = process.argv.indexOf("--limit");
const limit = limitIdx !== -1 ? parseInt(process.argv[limitIdx + 1]) : Infinity;

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchBuffer(res.headers.location).then(resolve).catch(reject);
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
    req.on("error", reject);
  });
}

async function resizeBuffer(buf) {
  const meta = await sharp(buf).metadata();
  const { width, height, format } = meta;
  const max = Math.max(width, height);

  if (max <= MAX_PX) {
    return { outBuf: null, width, height, skipped: true };
  }

  const ratio = MAX_PX / max;
  const cw = Math.round(width * ratio);
  const ch = Math.round(height * ratio);

  const outBuf = await sharp(buf)
    .resize(cw, ch)
    .jpeg({ quality: QUALITY })
    .toBuffer();

  return { outBuf, width, height, cw, ch, origSize: buf.length, newSize: outBuf.length, skipped: false };
}

function extractStoragePath(url) {
  const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function main() {
  console.log("== Supabase 사진 일괄 리사이즈 ==");
  console.log(`설정: max ${MAX_PX}px, JPEG quality ${QUALITY}, dry-run=${isDryRun}, limit=${limit}`);
  console.log();

  // 1. game_play_records에서 photo_url 전체 조회
  const { data: records, error } = await db
    .from("game_play_records")
    .select("id, photo_url")
    .not("photo_url", "is", null)
    .neq("photo_url", "");

  if (error) { console.error("DB 조회 실패:", error.message); process.exit(1); }

  // 2. JSON 배열 파싱 후 고유 URL 목록 추출
  const urlSet = new Set();
  for (const rec of records) {
    const raw = rec.photo_url.trim();
    let urls = [];
    if (raw.startsWith("[")) {
      try { urls = JSON.parse(raw).filter(Boolean); } catch (_) {}
    } else {
      urls = [raw];
    }
    urls.forEach((u) => { if (u.startsWith("http")) urlSet.add(u); });
  }

  const allUrls = [...urlSet];
  const target = allUrls.slice(0, limit === Infinity ? allUrls.length : limit);
  console.log(`총 고유 이미지 URL: ${allUrls.length}개 → 처리 대상: ${target.length}개\n`);

  if (isDryRun) {
    target.forEach((u, i) => console.log(`  ${i + 1}. ${u}`));
    return;
  }

  let done = 0, skipped = 0, errors = 0;

  for (let i = 0; i < target.length; i++) {
    const url = target[i];
    const storagePath = extractStoragePath(url);

    console.log(`[${i + 1}/${target.length}] ${storagePath || url}`);

    if (!storagePath) {
      console.log("  skip: 경로 파싱 불가");
      skipped++;
      continue;
    }

    try {
      const buf = await fetchBuffer(url);
      const result = await resizeBuffer(buf);

      if (result.skipped) {
        console.log(`  skip: ${result.width}x${result.height} ≤ ${MAX_PX}px`);
        skipped++;
      } else {
        console.log(
          `  resize: ${result.width}x${result.height} → ${result.cw}x${result.ch}` +
          ` | ${(result.origSize / 1024).toFixed(0)}KB → ${(result.newSize / 1024).toFixed(0)}KB`
        );

        // anon 키는 UPDATE 불가 → DELETE 후 INSERT
        const { error: delErr } = await db.storage.from(BUCKET).remove([storagePath]);
        if (delErr) {
          console.error(`  삭제 실패: ${delErr.message}`);
          errors++;
          continue;
        }

        const { error: upErr } = await db.storage
          .from(BUCKET)
          .upload(storagePath, result.outBuf, { contentType: "image/jpeg" });

        if (upErr) {
          console.error(`  업로드 실패: ${upErr.message}`);
          errors++;
        } else {
          console.log("  ✓ 완료");
          done++;
        }
      }
    } catch (e) {
      console.error(`  오류: ${e.message}`);
      errors++;
    }

    await sleep(400);
  }

  console.log("\n== 결과 ==");
  console.log(`리사이즈 완료: ${done}개 | 스킵(≤${MAX_PX}px): ${skipped}개 | 오류: ${errors}개`);
}

main().catch((e) => { console.error(e); process.exit(1); });
