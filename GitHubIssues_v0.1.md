# GitHub Issues v0.1

- 作成日: 2026-02-06
- 参照: `Backlog_v0.1.md`, `PRD_v0.1.md`, `UseCases_v0.1.md`
- 目的: `Backlog_v0.1.md` のチケットをGitHub Issue起票用に整形

## 1. 起票テンプレート

```md
Title: [ID] タイトル
Labels: priority:P0|P1|P2, type:Data|Infra|Backend|UI|Logic|Reminder|NLG|Test|UX, milestone:MVP-v0.1

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
- PRD_v0.1.md
- UseCases_v0.1.md
```

## 2. Issue Drafts

### [P0-01] ドメインモデル定義
- Labels: `priority:P0`, `type:Data`, `milestone:MVP-v0.1`
- Summary: `Task/Reminder/ConversationContext` と `due_state` を実装
- Scope: `scheduled/no_due/pending_due` を保存可能にする
- Acceptance Criteria: `FR-06`, `FR-07`, `FR-10`
- Dependencies: `なし`

### [P0-02] ローカル永続化実装
- Labels: `priority:P0`, `type:Infra`, `milestone:MVP-v0.1`
- Summary: ローカル保存（IndexedDB等）を実装し外部送信を行わない
- Scope: CRUD、スキーマ初期化、マイグレーション方針
- Acceptance Criteria: `FR-18`
- Dependencies: `P0-01`

### [P0-03] 入力分類エンジン
- Labels: `priority:P0`, `type:Backend`, `milestone:MVP-v0.1`
- Summary: タスク/メモ分類と曖昧判定ロジック
- Scope: 明確判定、曖昧時確認質問フラグ
- Acceptance Criteria: `FR-01`, `FR-02`, `UC-13`
- Dependencies: `P0-01`

### [P0-04] メモ内サブ分類
- Labels: `priority:P0`, `type:Backend`, `milestone:MVP-v0.1`
- Summary: `やりたいこと/アイデア/メモ` 自動分類
- Scope: サブ分類器と保存ロジック
- Acceptance Criteria: `FR-03`, `UC-06`, `UC-11`, `UC-12`
- Dependencies: `P0-03`

### [P0-05] 登録入力UI
- Labels: `priority:P0`, `type:UI`, `milestone:MVP-v0.1`
- Summary: 会話入力欄、送信、保存結果表示
- Scope: 入力フォーム、送信イベント、応答表示
- Acceptance Criteria: `UC-01` 基本導線動作
- Dependencies: `P0-03`

### [P0-06] 期日3択確認UI
- Labels: `priority:P0`, `type:UI`, `milestone:MVP-v0.1`
- Summary: `設定する/設定しない/後で設定する` UI
- Scope: 3択の表示と選択イベント
- Acceptance Criteria: `FR-04`, `UC-02`
- Dependencies: `P0-03`

### [P0-07] 期日3択分岐処理
- Labels: `priority:P0`, `type:Logic`, `milestone:MVP-v0.1`
- Summary: `scheduled/no_due/pending_due` への保存分岐
- Scope: 分岐ロジック、保存、状態遷移
- Acceptance Criteria: `FR-05`, `FR-06`, `UC-15`, `UC-16`
- Dependencies: `P0-06`

### [P0-08] `!期日設定` 表示
- Labels: `priority:P0`, `type:UI`, `milestone:MVP-v0.1`
- Summary: `pending_due` 強調表示と `no_due` 区別
- Scope: 一覧表示スタイル、フィルタ/バッジ
- Acceptance Criteria: `FR-07`, `UC-16`
- Dependencies: `P0-07`

### [P0-09] 日付のみ期限の `○/✕` 確認UI
- Labels: `priority:P0`, `type:UI`, `milestone:MVP-v0.1`
- Summary: 既定時刻補完提案と `○/✕` 確認
- Scope: 提案文表示、`○/✕` 入力導線
- Acceptance Criteria: `FR-08`, `UC-08`
- Dependencies: `P0-06`

### [P0-10] `○/✕` 時刻確定分岐
- Labels: `priority:P0`, `type:Logic`, `milestone:MVP-v0.1`
- Summary: `○` 即確定 / `✕` 自然言語入力遷移
- Scope: 遷移制御、入力受付ガード
- Acceptance Criteria: `FR-09`, `FR-10`, `UC-08`
- Dependencies: `P0-09`

### [P0-11] 期日自然言語解釈
- Labels: `priority:P0`, `type:Logic`, `milestone:MVP-v0.1`
- Summary: `設定する` 後の期日自然言語を日時化
- Scope: 相対日付、再確認フロー
- Acceptance Criteria: `FR-05`, `UC-15`
- Dependencies: `P0-07`

### [P0-12] ローカル通知基盤
- Labels: `priority:P0`, `type:Reminder`, `milestone:MVP-v0.1`
- Summary: 通知作成・表示・タップ遷移
- Scope: スケジューリング、通知ハンドラ
- Acceptance Criteria: `FR-17`, `UC-01`, `UC-04`
- Dependencies: `P0-02`

### [P0-13] オフセット解釈エンジン
- Labels: `priority:P0`, `type:Reminder`, `milestone:MVP-v0.1`
- Summary: `1時間前/30分前/前日` などを相対解釈
- Scope: オフセット正規化、基準時刻適用
- Acceptance Criteria: `FR-11`, `UC-14`
- Dependencies: `P0-12`

### [P0-14] 対象曖昧時 `○/✕` 確認
- Labels: `priority:P0`, `type:UI`, `milestone:MVP-v0.1`
- Summary: 対象タスク候補の確認UI
- Scope: 候補提示、`✕` 時の自然言語補足
- Acceptance Criteria: `FR-12`, `FR-13`, `UC-17`
- Dependencies: `P0-13`

### [P0-15] 応答テンプレート + 要約スロット
- Labels: `priority:P0`, `type:NLG`, `milestone:MVP-v0.1`
- Summary: テンプレート固定 + `〇〇` 要約のみ生成
- Scope: スロット生成API、テンプレート適用
- Acceptance Criteria: `FR-14`, `FR-15`
- Dependencies: `P0-03`

### [P0-16] 応答フォールバック制御
- Labels: `priority:P0`, `type:NLG`, `milestone:MVP-v0.1`
- Summary: 不適切生成時の安全文切替
- Scope: 検証ルール、フォールバック実装
- Acceptance Criteria: `FR-16`
- Dependencies: `P0-15`

### [P0-17] P0総合テスト
- Labels: `priority:P0`, `type:Test`, `milestone:MVP-v0.1`
- Summary: P0のE2E検証
- Scope: `UC-01~UC-17` のP0ケースを自動/手動で確認
- Acceptance Criteria: PRDのP0受け入れ条件を満たす
- Dependencies: `P0-01` 〜 `P0-16`

### [P1-01] 時刻未指定リマインド改善
- Labels: `priority:P1`, `type:Reminder`, `milestone:MVP-v0.1`
- Summary: 補足確認/提案文面の改善
- Scope: 提案ロジックと文面最適化
- Acceptance Criteria: `UC-05`, `UC-09` の成功率改善
- Dependencies: `P0-13`

### [P1-02] 相対日付解釈精度強化
- Labels: `priority:P1`, `type:Logic`, `milestone:MVP-v0.1`
- Summary: 来週/翌週など境界ケースの強化
- Scope: 日付パーサの追加ルール
- Acceptance Criteria: `UC-09` 安定通過
- Dependencies: `P0-11`

### [P1-03] 確認UIの操作性改善
- Labels: `priority:P1`, `type:UX`, `milestone:MVP-v0.1`
- Summary: `○/✕` 導線の視認性と誤操作低減
- Scope: UI改善、操作ログ確認
- Acceptance Criteria: 誤操作率低下
- Dependencies: `P0-09`, `P0-14`

### [P2-01] 応答文チューニング
- Labels: `priority:P2`, `type:NLG`, `milestone:MVP-v0.1`
- Summary: 文体一貫性と自然さ改善
- Scope: 文面ルール・テンプレート調整
- Acceptance Criteria: 会話品質KPI改善
- Dependencies: `P0-16`

### [P2-02] 境界ケース拡張
- Labels: `priority:P2`, `type:Logic`, `milestone:MVP-v0.1`
- Summary: 稀な曖昧入力の再確認ロジック追加
- Scope: 追加ルールと再確認フロー
- Acceptance Criteria: 失敗率低減
- Dependencies: `P0-17`

### [P2-03] 一覧画面微調整
- Labels: `priority:P2`, `type:UX`, `milestone:MVP-v0.1`
- Summary: `!期日設定` の表示最適化
- Scope: 視認性改善、情報密度調整
- Acceptance Criteria: 視認性評価改善
- Dependencies: `P0-08`
