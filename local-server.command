#!/bin/sh
if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' 'Node.js is required. Install it from https://nodejs.org/'
  printf '%s' 'Press Enter to close.'
  read -r unused
  exit 1
fi

node "$(dirname "$0")/local-server.js" --open "$@"
status=$?
if [ "$status" -ne 0 ] && [ "$status" -lt 128 ] && [ -t 0 ]; then
  printf '%s' 'Press Enter to close.'
  read -r unused
fi
exit "$status"
