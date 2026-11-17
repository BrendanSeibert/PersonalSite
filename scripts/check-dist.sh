#!/bin/sh
# Run after `npm run build` in frontend/. Fails if the build would break the CSP or leak source.
set -eu
dist="${1:-frontend/dist}"
test -f "$dist/index.html" || { echo "no index.html in $dist"; exit 1; }
if grep -Eq '<script[^>]*>[^<]' "$dist/index.html" || grep -q '<style' "$dist/index.html"; then
  echo "index.html contains an inline script or style: the CSP would block it"; exit 1
fi
if find "$dist" -name '*.map' | grep -q .; then echo "source maps found in $dist"; exit 1; fi
echo "dist ok"
