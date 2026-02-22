#!/bin/sh

# these are the things I do before a release

set -e

(cd packages/typeslayer/src-tauri && cargo check)

n auto
pnpm install
pnpm lint:fix
pnpm format
pnpm build
pnpm typecheck

pnpm bump

# then, push this commit and run `pnpm tag` to trigger the release workflow

# then, hope windows works
