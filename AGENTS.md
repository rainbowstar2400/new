# AGENTS.md

このリポジトリで作業するエージェント向けガイドです。

## 対象

- 作業対象は常に `C:\Users\cs24035\Documents\develop\new`
- リモートは `https://github.com/rainbowstar2400/new.git`

## 強制ルール

- 書き込み前に `pnpm preflight` を実行する。
- `git status --short --branch` を節目ごとに確認する。
- `apply_patch` は使用しない（`workdir`固定できないため）。
- 書き込みは `workdir` を明示した PowerShell コマンドで実行する。

## 実装方針

- Online MVP v0.2 を基準に進める。
- モノレポ構成: `apps/web`, `apps/api`, `packages/shared`, `infra`。
- 仕様変更時は `Documents/*_v0.2.md` と `Issues/*_v0.2.md` を同期更新する。
