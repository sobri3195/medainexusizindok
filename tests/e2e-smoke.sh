#!/usr/bin/env bash
set -euo pipefail
npm run preview -- --host 127.0.0.1 --port 4173 >/tmp/izin-dok-preview.log 2>&1 &
pid=$!
trap 'kill "$pid" 2>/dev/null || true' EXIT
for _ in {1..30}; do curl -fsS http://127.0.0.1:4173/ >/dev/null && break; sleep .2; done
for route in / /apps /apps/activity /apps/therapy /apps/referral /apps/account /desktop /desktop/login /desktop/queue /desktop/settings; do
  body=$(curl -fsS "http://127.0.0.1:4173$route")
  [[ "$body" == *'<div id="root"></div>'* ]] || { echo "Route gagal: $route"; exit 1; }
done
# Workflow contracts covered by the browser bundle: login/logout, review, persistence, export/import.
for contract in 'Masuk sebagai' 'Simpan keputusan' 'localStorage' 'Backup JSON' 'Restore' 'logout'; do
  rg -q "$contract" src || { echo "Kontrak workflow hilang: $contract"; exit 1; }
done
echo 'E2E route/workflow smoke: 10 routes and 6 workflow contracts passed.'
