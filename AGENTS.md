# AGENTS.md

このリポジトリで作業するエージェント向けの簡易ガイドです。

## リポジトリの目的

- 本リポジトリ (`new`) は、個人向け「自分専用秘書PWA」の企画・要件・実装計画を管理する場所です。
- 現在はドキュメント中心（`Documents/`, `Issues/`）で、アプリ本体コードは未作成です。

## 作業ポリシー

- 変更対象のリポジトリと作業ディレクトリを必ず確認してから編集すること。
- まずドキュメント更新を優先し、仕様の整合を維持すること。
- 意図しない別リポジトリへの変更を避けること。
- 破壊的なGit操作（`reset --hard` 等）は、明示指示がある場合のみ実行すること。

## ドキュメント構成

- `Documents/ProductBrief_v0.1.md`: プロダクト概要と価値仮説
- `Documents/UseCases_v0.1.md`: ユースケースと受け入れ条件
- `Documents/PRD_v0.1.md`: 要件定義（機能・非機能・KPI）
- `Documents/Backlog_v0.1.md`: 実装バックログ
- `Issues/GitHubIssues_v0.1.md`: Issue下書き
- `Issues/GitHubIssueCommands_v0.1.md`: `gh` コマンド例

## 今後の実装方針（要約）

- 実装は `Documents/Backlog_v0.1.md` の `P0` から順に進める。
- MVP達成条件は `Documents/PRD_v0.1.md` のリリース判定に準拠する。
- 会話入力、分類、期日確認、リマインド調整を最優先で扱う。
