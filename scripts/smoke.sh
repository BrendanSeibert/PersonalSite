#!/bin/sh
# Builds the production image, runs it against a throwaway PostgreSQL, and checks the real image,
# the real user, the real files and the production wiring. Prints "smoke ok" on success.
set -eu
net=ex3-smoke; img=ex3-smoke:latest; base=http://127.0.0.1:8080
cleanup() { docker rm -f ex3-smoke-app ex3-smoke-db >/dev/null 2>&1 || true; docker network rm $net >/dev/null 2>&1 || true; }
trap cleanup EXIT; cleanup
docker build -t $img .
docker network create $net >/dev/null
docker run -d --name ex3-smoke-db --network $net -e POSTGRES_USER=t -e POSTGRES_PASSWORD=t -e POSTGRES_DB=t postgres:16-alpine >/dev/null

# Wait for PostgreSQL before starting the app: the app exits if its first migration can't connect.
# TCP (-h 127.0.0.1), because during first-start setup PostgreSQL listens on a local socket only.
ready=no
for i in $(seq 1 30); do
  if docker exec ex3-smoke-db pg_isready -h 127.0.0.1 -U t -d t >/dev/null 2>&1; then ready=yes; break; fi
  sleep 1
done
[ "$ready" = yes ] || { echo "database never became ready"; exit 1; }

docker run -d --name ex3-smoke-app --network $net -p 127.0.0.1:8080:3000 \
  -e DATABASE_URL=postgres://t:t@ex3-smoke-db:5432/t -e DATABASE_PRIVATE_NETWORK=true \
  -e COOKIE_SECURE=true -e TRUST_PROXY=1 -e VISITOR_SECRET=smoke-test-secret-0123456789abcdefghij $img >/dev/null
up=no
for i in $(seq 1 30); do
  if curl -fs $base/api/health >/dev/null 2>&1; then up=yes; break; fi
  sleep 1
done
[ "$up" = yes ] || { echo "app never became healthy"; docker logs ex3-smoke-app; exit 1; }

check() { "$@" || { echo "smoke check failed: $*"; exit 1; }; }

check sh -c "curl -fs $base/api/health | grep -q '\"db\":\"up\"'"
check sh -c "curl -fsI $base/about | grep -qi '^content-type: text/html'"
check sh -c "curl -fsI $base/about | grep -qi '^cache-control: no-cache'"
check sh -c "curl -fsI $base/ | grep -qi '^content-security-policy: default-src'"
check sh -c "curl -fsI $base/ | grep -qi '^strict-transport-security: max-age=86400'"
asset=$(curl -fs $base/ | grep -o '/assets/index-[^"]*\.js' | head -1)
[ -n "$asset" ] || { echo "smoke check failed: no /assets/index-*.js in index.html"; exit 1; }
check sh -c "curl -fsI '$base$asset' | grep -qi 'immutable'"
# compression skips HEAD requests, so this is a GET that keeps the headers and throws the body away
check sh -c "curl -fs -H 'Accept-Encoding: gzip' -D - -o /dev/null '$base$asset' | grep -qi '^content-encoding: gzip'"
check sh -c "curl -s -o /dev/null -w '%{http_code}' $base/api/nope | grep -q 404"
check sh -c "curl -s -o /dev/null -w '%{http_code}' $base/assets/missing.js | grep -q 404"
check sh -c "curl -s -o /dev/null -w '%{http_code}' $base/.env | grep -q 404"

# Production wiring: a foreign Origin is refused, the site's own is accepted, and the new-visitor limit
# (30 an hour) bites even when each like carries a made-up, unsigned visitor ID.
check sh -c "curl -s -o /dev/null -w '%{http_code}' -X PUT -H 'Origin: https://evil.example' $base/api/favorites/entry01 | grep -q 403"
check sh -c "curl -s -o /dev/null -w '%{http_code}' -X PUT -H 'Origin: $base' $base/api/favorites/entry01 | grep -q 200"
forged='ex3_visitor=3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
codes=$(for i in $(seq 1 35); do curl -s -o /dev/null -w '%{http_code} ' -X PUT -H "Cookie: $forged" $base/api/favorites/entry01; done)
echo "$codes" | grep -q 429 || { echo "smoke check failed: no 429 from the new-visitor limit ($codes)"; exit 1; }

check sh -c "docker exec ex3-smoke-app whoami | grep -qx node"
# No source, no .env, no dev packages. (npm prune can leave an empty @vitest folder, so look for packages.)
check docker exec ex3-smoke-app sh -c 'test ! -e /app/src && test ! -e /app/.env && ! find /app/node_modules -path "*vitest*" -name package.json | grep -q .'
check sh -c "docker logs ex3-smoke-app | grep -q 'Applied migration 001_create_frogs.sql'"
echo "smoke ok"
