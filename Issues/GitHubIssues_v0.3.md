# GitHub Issues v0.3

- 作成日: 2026-02-15
- 参照: `Documents/Backlog_v0.3.md`, `Documents/PRD_v0.3.md`, `Documents/UseCases_v0.3.md`
- 目的: v0.3バックログをGitHub Issueへ同期する

## 1. 起票テンプレート

```md
Title: [ID] タイトル
Labels: priority:P1|P2, type:UI|UX|Logic, milestone:MVP-v0.3

## Summary
このIssueで実装する範囲

## Scope
- 作業項目1
- 作業項目2

## Acceptance Criteria
- 対応FR/UCを満たすこと

## Dependencies
- 依存Issue ID

## References
- Documents/PRD_v0.3.md
- Documents/UseCases_v0.3.md
- Documents/Backlog_v0.3.md
```

## 2. v0.3 Issue Drafts

| ID | タイトル | 推奨ラベル | Scope（要点） | Acceptance（要点） |
| --- | --- | --- | --- | --- |
| P1-01 | モバイル下部タブUI全面刷新 | `priority:P1`, `type:UI`, `milestone:MVP-v0.3` | 3タブ導入、下部固定ナビ、`active_tab_v03/items_filter_v03` 復元、`?taskId=` 深リンク遷移 | UC-30〜UC-35, FR-26〜FR-32 |
| P2-01 | 分類境界ケース拡張 | `priority:P2`, `type:Logic`, `milestone:MVP-v0.3` | `〜たい`/単語タスク強化、曖昧確認徹底、`task_or_memo -> memo_category` 強制、未分類保存防止 | UC-36〜UC-40, FR-33〜FR-37 |
| P2-02 | 一覧画面微調整 | `priority:P2`, `type:UX`, `milestone:MVP-v0.3` | `!期日設定` バッジ再設計、カードメタ優先度整理、空状態UI | UC-41, FR-38〜FR-40 |

## 3. 共通Acceptance Criteria

- `pnpm test` が通る
- `pnpm --filter @new/web test:e2e` が通る
- `v0.1` 回帰観点（`洗濯` 正規化、`〜たい`、`転職準備`、`memo_category` 強制）を維持する

## 4. 推奨ラベル

- `priority:P1`
- `priority:P2`
- `type:UI`
- `type:UX`
- `type:Logic`
- `milestone:MVP-v0.3`
