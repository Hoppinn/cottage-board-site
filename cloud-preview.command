#!/bin/sh
set -eu

remote='https://github.com/Hoppinn/cottage-board-site.git'
branch='cloud-preview'
preview_dir="${XDG_DATA_HOME:-$HOME/.local/share}/CottageBoardPreview/cottage-board-site"

fail() {
  printf '%s\n' "$*" >&2
  exit 1
}

command -v git >/dev/null 2>&1 || fail 'Git을 설치한 뒤 다시 실행해 주세요.'
command -v node >/dev/null 2>&1 || fail 'Node.js 20 이상을 설치한 뒤 다시 실행해 주세요.'

if [ -d "$preview_dir/.git" ]; then
  [ "$(git -C "$preview_dir" config --get remote.origin.url)" = "$remote" ] ||
    fail "테스트 폴더의 GitHub 주소가 다릅니다: $preview_dir"
  [ "$(git -C "$preview_dir" branch --show-current)" = "$branch" ] ||
    fail "테스트 폴더의 브랜치가 $branch 브랜치와 다릅니다: $preview_dir"
  changes=$(git -C "$preview_dir" status --porcelain)
  [ -z "$changes" ] || fail "테스트 폴더에 수정한 파일이 있어 갱신을 멈췄습니다: $preview_dir"
  git -C "$preview_dir" pull --ff-only origin "$branch"
  [ "$(git -C "$preview_dir" rev-parse HEAD)" = "$(git -C "$preview_dir" rev-parse FETCH_HEAD)" ] ||
    fail "테스트 폴더에 별도 커밋이 있어 실행을 멈췄습니다: $preview_dir"
else
  [ ! -e "$preview_dir" ] || fail "테스트 폴더가 이미 있습니다: $preview_dir"
  git clone --depth 1 --single-branch --branch "$branch" "$remote" "$preview_dir"
fi

git -C "$preview_dir" log -1 --format='테스트 중인 커밋 %h %s'
exec node "$preview_dir/local-server.js" --open
