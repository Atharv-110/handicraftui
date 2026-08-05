#!/usr/bin/env bash
#
# Runs a Playwright project — `e2e` or `visual`, the caller's first argument
# — inside the exact pinned image CI uses (cycle 003 §2.3), so a screenshot
# generated or compared here matches CI's without a human owning a
# platform-sniffing step. Cycle 003 §15.3's fix brief, replacing a
# `package.json` one-liner that corrupted the host `node_modules`. Cycle 004
# adds the project argument so this one script reaches both projects rather
# than growing a second copy of itself for `visual`.
#
# The corruption mechanism: the repo is bind-mounted read-write at /w (it has
# to be — `*-snapshots/` must persist for `test:e2e:update` to produce a
# committable baseline, and `test-results/` must persist so a failing run's
# diff PNGs land somewhere a human can open them). A bind mount is a window
# straight onto the host filesystem, so `pnpm install` running inside a Linux
# container, on a bind-mounted `node_modules` built by a macOS host, hits a
# platform mismatch and pnpm refuses and asks for confirmation. `-it` does
# not fix that — it supplies exactly the confirmation pnpm is waiting for,
# and pnpm then purges and rewrites the HOST's `node_modules` with Linux
# binaries. `-e CI=true` is the same trap by another route: it was measured
# to force `pnpm install` past the same abort and land
# `node_modules/.pnpm/@esbuild+linux-arm64@*` on the host, silently, blocking
# every one of the five gates until someone reinstalled by hand. Neither goes
# back in — see the invariant below.
set -euo pipefail

# The project name is the caller's first positional argument, shifted off
# before anything else reads "$@" — cycle 004 adds the `visual` project
# alongside `e2e`, and this script has to reach both without a second copy of
# itself. `pnpm test:e2e:docker:visual -g "M1"` arrives here as
# `bash scripts/e2e-docker.sh visual -g M1`; after the shift, `proj=visual`
# and `"$@"` is `-g M1`, forwarded unchanged to the idiom below.
proj="$1"
shift

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

IMAGE="mcr.microsoft.com/playwright:v1.62.1-noble"

# The tag above is an OCI image *index*, not an image: `docker manifest
# inspect` returns two entries, sha256:c091b21d… for linux/amd64 and
# sha256:941cc91e… for linux/arm64, and the daemon picks by host
# architecture. So pinning the tag pins the Playwright version and pins
# neither the digest nor the instruction set. Cycle 004 shipped 68 baselines
# generated here on arm64 and CI compared them on amd64: 11 of 67 failed,
# 146 to 874 differing pixels, including two tier-1 cells that run no
# JavaScript at all — a rasterization difference, not a code one. Every
# committed baseline is linux/arm64 (cycle 004a §2.3), so a daemon of any
# other architecture can neither generate nor check one, and is refused
# here rather than allowed to write a baseline nobody can reproduce.
DAEMON_ARCH="$(docker version --format '{{.Server.Arch}}' 2>/dev/null || true)"
if [ -z "$DAEMON_ARCH" ]; then
  echo "e2e-docker: could not read the Docker daemon architecture. Is the daemon running?" >&2
  exit 1
fi
if [ "$DAEMON_ARCH" != "arm64" ]; then
  echo "e2e-docker: daemon architecture is '$DAEMON_ARCH', not 'arm64'." >&2
  echo "e2e-docker: every committed baseline is rendered on linux/arm64. Refusing to run." >&2
  exit 1
fi

# Invariant: no command running inside the container may write to any host
# `node_modules`. The fix is not tightening the bind mount — it stays
# read-write on purpose, for the reasons above — it is shadowing every
# workspace package's `node_modules` with a container-owned named volume, so
# `pnpm install` inside the container writes into its own storage and the
# bind mount underneath is never touched.
#
# The package list is derived, not typed. A `find` over the host tree would
# under-enumerate: `pnpm -r list --depth -1` returns 6 workspace packages
# today, but only 5 carry a `node_modules` on the host — `packages/
# typescript-config` has none yet, and a `find` would silently skip shadowing
# it. The miss would not be loud; the container would just install into that
# one unshadowed directory and write straight through the bind mount. `node`
# (not `jq`, which the pinned image does not ship) turns each package's
# absolute path into a path relative to the repo root — the empty string for
# the root package itself, which is what makes `/w/node_modules` (the
# workspace root's own install) get shadowed too.
#
# `mapfile` was a bash 4 builtin and macOS ships bash 3.2 — measured
# `mapfile: command not found`, exit 127 under `set -e`, so the script did
# not run at all on a stock shell. A `while read` loop is bash 3.1 and reads
# an empty line as an empty element, which this loop depends on: the
# workspace root's own relative path is the empty string, and that empty
# string is what makes `/w/node_modules` get shadowed.
PKG_COUNT=0
PKG_RELDIRS=()
while IFS= read -r rel; do
  PKG_RELDIRS+=("$rel")
  PKG_COUNT=$((PKG_COUNT + 1))
done < <(pnpm -r list --depth -1 --json | node -e '
  const path = require("node:path");
  let data = "";
  process.stdin.on("data", (chunk) => { data += chunk; });
  process.stdin.on("end", () => {
    const root = process.cwd();
    for (const pkg of JSON.parse(data)) {
      process.stdout.write(path.relative(root, pkg.path) + "\n");
    }
  });
')

# An empty list means zero shadowing, which is the exact path back to the
# host `node_modules` corruption this script exists to prevent — so it fails
# here rather than running unprotected. Counted in the loop rather than read
# from `${#PKG_RELDIRS[@]}`, which errors on an empty array under `set -u` in
# bash 3.2.
if [ "$PKG_COUNT" -eq 0 ]; then
  echo "e2e-docker: pnpm -r list returned no workspace packages; refusing to run unshadowed" >&2
  exit 1
fi

VOLUME_ARGS=()
for rel in "${PKG_RELDIRS[@]}"; do
  if [[ -z "$rel" ]]; then
    mount_point="/w/node_modules"
    slug="root"
  else
    mount_point="/w/$rel/node_modules"
    slug="${rel//\//-}"
  fi
  # Named, not anonymous. `--rm` discards anonymous volumes with the
  # container, so every invocation would reinstall from cold — this is the
  # path a human runs repeatedly while chasing a screenshot diff, and a
  # reproduction slow enough to avoid is not a reproduction. Staleness is
  # bounded by `--frozen-lockfile` below, which fails loudly rather than
  # drifting. Drop these with:
  #   docker volume ls -q --filter name=hc-e2e- | xargs -r docker volume rm
  VOLUME_ARGS+=(-v "hc-e2e-${slug}-node-modules:${mount_point}")
done

# A second, distinct host-write leak, found running this script for real
# rather than reasoned about: `node_modules` was not the only thing the bind
# mount exposed. With no store volume, pnpm's content-addressable store
# resolves under the container's `$HOME` by default — a different filesystem
# from the bind-mounted repo — and pnpm avoids hardlinking across that
# boundary by relocating its store to sit beside the project instead, which
# for a bind mount means writing a `.pnpm-store/` directory straight onto the
# HOST at the repo root. Same shadowing fix as `node_modules`: a named volume
# gives the store somewhere container-owned to live so it never needs to
# relocate through the mount at all.
VOLUME_ARGS+=(-v "hc-e2e-pnpm-store:/pnpm-store")

# No `-it`: this script never needs a TTY, and (see above) supplying one is
# what turns pnpm's abort into silent corruption. No `-e CI=true`, same
# reason by a different route. If a future reader is tempted to add either
# back to silence a pnpm prompt, the prompt is the mount being unshadowed
# somewhere — fix the volume list, not the prompt.
#
# `bash -lc SCRIPT bash "$proj" "$@"` is the standard idiom for forwarding a
# caller's arguments through a `-c` string: everything after SCRIPT becomes
# that bash's own positional parameters ($0 is the literal "bash" placeholder,
# $1 is the project, $2... are the real arguments), so `"$1"` and `"${@:2}"`
# inside SCRIPT expand to them. Without this, `pnpm test:e2e:docker -g P3`'s
# `-g P3` would land after the whole docker invocation instead of reaching
# `playwright test`, and the filter would be silently dropped — exactly the
# failure QA reproduced. The project rides through as the first forwarded
# positional, the same idiom one argument longer — `pnpm exec playwright
# test` rather than `pnpm test:e2e`, because the latter is now
# `e2e`-specific and this script has to reach `visual` too.
#
# `--platform linux/arm64` is not redundant with the daemon check above. That
# check covers the daemon; this covers a stale locally-cached amd64 image
# under this same tag — if anyone ever ran this script with
# `--platform linux/amd64`, the local tag now points at the amd64 manifest
# and a bare `docker run` would use it even on an arm64 daemon. The flag
# forces the correct manifest regardless of what is cached.
docker run --rm --ipc=host --platform linux/arm64 \
  -v "$ROOT":/w \
  "${VOLUME_ARGS[@]}" \
  -w /w \
  "$IMAGE" \
  bash -lc 'corepack enable && pnpm install --frozen-lockfile --store-dir /pnpm-store && HC_SNAPSHOT_ENV=docker pnpm exec playwright test --project="$1" "${@:2}"' bash "$proj" "$@"
