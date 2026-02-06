# GitHub Issues v0.2

- 作成日: 2026-02-07
- 参照: `Documents/Backlog_v0.2.md`, `Documents/PRD_v0.2.md`, `Documents/UseCases_v0.2.md`
- 目的: v0.2バックログをGitHub Issueへ同期する

## 1. 起票テンプレート

```md
Title: [ID] タイトル
Labels: priority:P0|P1|P2, type:Data|Infra|API|Backend|Logic|UI|Reminder|NLG|Test|UX|Job, milestone:MVP-v0.2

## Summary
このIssueで実装する範囲

## Scope
- 作業項目1
- 作業項目2

## Acceptance Criteria
- FR/UCを満たすこと

## Dependencies
- 依存Issue ID

## References
- Documents/PRD_v0.2.md
- Documents/UseCases_v0.2.md
- Documents/Backlog_v0.2.md
```

## 2. P0 Issue Drafts

| ID | タイトル | Labels（推奨） |
| --- | --- | --- |
| P0-01 | ドメインモデル定義 | `priority:P0`, `type:Data`, `milestone:MVP-v0.2` |
| P0-02 | PostgreSQL永続化 | `priority:P0`, `type:Infra`, `milestone:MVP-v0.2` |
| P0-03 | 入力分類エンジン | `priority:P0`, `type:Logic`, `milestone:MVP-v0.2` |
| P0-04 | メモ内サブ分類 | `priority:P0`, `type:Logic`, `milestone:MVP-v0.2` |
| P0-05 | 会話入力UI | `priority:P0`, `type:UI`, `milestone:MVP-v0.2` |
| P0-06 | 期日3択UI | `priority:P0`, `type:UI`, `milestone:MVP-v0.2` |
| P0-07 | 3択保存分岐 | `priority:P0`, `type:Logic`, `milestone:MVP-v0.2` |
| P0-08 | `!期日設定` 表示 | `priority:P0`, `type:UI`, `milestone:MVP-v0.2` |
| P0-09 | 日付のみ `○/✕` 確認 | `priority:P0`, `type:UI`, `milestone:MVP-v0.2` |
| P0-10 | `○/✕` 分岐 | `priority:P0`, `type:Logic`, `milestone:MVP-v0.2` |
| P0-11 | 期日自然言語解釈 | `priority:P0`, `type:Logic`, `milestone:MVP-v0.2` |
| P0-12 | Web Push購読/配信基盤 | `priority:P0`, `type:Reminder`, `milestone:MVP-v0.2` |
| P0-13 | オフセット解釈 | `priority:P0`, `type:Reminder`, `milestone:MVP-v0.2` |
| P0-14 | 対象曖昧 `○/✕` 確認 | `priority:P0`, `type:UI`, `milestone:MVP-v0.2` |
| P0-15 | GPT要約スロット | `priority:P0`, `type:NLG`, `milestone:MVP-v0.2` |
| P0-16 | 要約フォールバック | `priority:P0`, `type:NLG`, `milestone:MVP-v0.2` |
| P0-17 | 単体/結合/主要E2E | `priority:P0`, `type:Test`, `milestone:MVP-v0.2` |
| P0-18 | 匿名デバイス登録API | `priority:P0`, `type:API`, `milestone:MVP-v0.2` |
| P0-19 | チャットAPI | `priority:P0`, `type:API`, `milestone:MVP-v0.2` |
| P0-20 | Push購読API | `priority:P0`, `type:API`, `milestone:MVP-v0.2` |
| P0-21 | 通知配信ジョブ | `priority:P0`, `type:Job`, `milestone:MVP-v0.2` |

## 3. P1 Issue Drafts（詳細）

| ID | タイトル | Labels（推奨） | 追加Scope（要点） |
| --- | --- | --- | --- |
| P1-01 | 時刻未指定リマインド改善 | `priority:P1`, `type:Reminder`, `milestone:MVP-v0.2` | 確認文統一、既定時刻提案強化、`✕` 後のみ自然言語入力 |
| P1-02 | 相対日付解釈精度強化 | `priority:P1`, `type:Logic`, `milestone:MVP-v0.2` | `OPENAI_DUE_PARSE_MODE` 導入、AI解釈 + 厳格検証、検証失敗時確認戻し |
| P1-03 | 確認UIの操作性改善 | `priority:P1`, `type:UX`, `milestone:MVP-v0.2` | `inputMode/confirmationType/negativeChoice` 追加、UI入力制御、関連テスト追加 |

### P1 共通 Acceptance Criteria

- `choice_only` で自由入力不可
- `choice_then_text_on_negative` で `✕` 後のみ自由入力可能
- AI日時解釈の検証失敗時に `due_choice` へ戻る
- `v0.1` 回帰観点（`洗濯` 正規化、`〜たい` want分類、`転職準備` 確認）を維持

## 4. P2 Issue Drafts

| ID | タイトル | Labels（推奨） |
| --- | --- | --- |
| P2-01 | 応答文チューニング | `priority:P2`, `type:NLG`, `milestone:MVP-v0.2` |
| P2-02 | 境界ケース拡張 | `priority:P2`, `type:Logic`, `milestone:MVP-v0.2` |
| P2-03 | 一覧画面微調整 | `priority:P2`, `type:UX`, `milestone:MVP-v0.2` |

## 5. 推奨ラベル

- `priority:P0`
- `priority:P1`
- `priority:P2`
- `type:Data`
- `type:Infra`
- `type:API`
- `type:Backend`
- `type:Logic`
- `type:UI`
- `type:Reminder`
- `type:NLG`
- `type:Test`
- `type:UX`
- `type:Job`
- `milestone:MVP-v0.2`
