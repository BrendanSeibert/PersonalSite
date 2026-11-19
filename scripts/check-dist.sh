#!/bin/sh
# Run after `npm run build` in frontend/. Fails if the build would break the CSP or leak source.
set -eu
dist="${1:-frontend/dist}"
test -f "$dist/index.html" || { echo "no index.html in $dist"; exit 1; }
# One line, so a tag split across lines is still seen.
html=$(tr '\n\r' '  ' < "$dist/index.html")
fail() { echo "index.html $1: the CSP would block it"; exit 1; }
# Every <script> must load a file (src=); an inline one has none.
echo "$html" | grep -Eo '<script[^>]*>' | grep -vq 'src=' && fail "contains an inline script"
echo "$html" | grep -qi '<style' && fail "contains a <style> block"
echo "$html" | grep -Eqi '<[a-z][^>]*[[:space:]](style|on[a-z]+)=' && fail "contains an inline style or event attribute"
if find "$dist" -name '*.map' | grep -q .; then echo "source maps found in $dist"; exit 1; fi
echo "dist ok"
