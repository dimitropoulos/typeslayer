#!/bin/sh
# trying with all my might to keep this project simple lol
# these are the things I do before a release

set -e

(cd packages/typeslayer/src-tauri && cargo check)

n auto
pnpm install
pnpm biome:check
pnpm --filter @typeslayer/internal  gen:rust-types
pnpm --filter @typeslayer/common    build
pnpm --filter @typeslayer/analytics build
pnpm --filter @typeslayer/admin     build
pnpm --filter @typeslayer/validate  build
pnpm --filter @typeslayer/internal  build
pnpm typecheck

pnpm bump

# then, push this commit and run `pnpm tag` to trigger the release workflow
# then, hope windows works
