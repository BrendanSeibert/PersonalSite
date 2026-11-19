#!/bin/sh
set -eu
here=$(dirname "$0"); tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
expect() { # expect <ok|fail> <html>
  rm -rf "$tmp/d"; mkdir -p "$tmp/d"; printf '%s' "$2" > "$tmp/d/index.html"
  if sh "$here/check-dist.sh" "$tmp/d" >/dev/null 2>&1; then got=ok; else got=fail; fi
  [ "$got" = "$1" ] || { echo "expected $1, got $got for: $2"; exit 1; }
}
expect ok   '<html><script type="module" crossorigin src="/assets/index-a1.js"></script></html>'
expect fail '<html><script>
  alert(1)
</script></html>'
expect fail '<html><script>alert(1)</script></html>'
expect fail '<html><style>p{}</style></html>'
expect fail '<html><div style="color:red"></div></html>'
expect fail '<html><img src="x" onerror="alert(1)"></html>'
# A source map next to a clean index.html must fail too.
rm -rf "$tmp/d"; mkdir -p "$tmp/d"
printf '%s' '<html><script type="module" src="/assets/a.js"></script></html>' > "$tmp/d/index.html"
: > "$tmp/d/a.js.map"
if sh "$here/check-dist.sh" "$tmp/d" >/dev/null 2>&1; then echo "expected fail for a .map file"; exit 1; fi
echo "check-dist tests ok"
