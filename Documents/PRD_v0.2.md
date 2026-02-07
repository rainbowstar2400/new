# PRD v0.2

- 作成日: 2026-02-07
- 対象: Online MVP
- 参照: `ProductBrief_v0.2.md`, `UseCases_v0.2.md`, `PRD_v0.1.md`

## 1. 概要

本プロダクトは、会話入力からタスク・メモ・リマインドを一気通貫で扱う個人向けPWAである。  
`v0.2` ではオンラインMVPとして、匿名デバイスID + サーバー保存 + Web Push + GPT要約スロットを採用する。

## 2. スコープ（MVP）

- 会話入力
- タスク/メモ分類
- メモ内サブ分類
- 分類曖昧時の確認フロー強化（`task_or_memo` → `memo_category`）
- 期日3択フロー
- 日付のみ期限の既定時刻補完 + `○/✕`
- オフセット調整
- 対象曖昧時の `○/✕` 確認
- 応答テンプレート + GPT要約スロット + フォールバック
- 応答文体設定（`丁寧/フレンドリー/簡潔`）
- 匿名デバイスID登録
- Web Push購読/配信

## 3. 非スコープ（MVP）

- メール認証
- 複数アカウント管理
- 高度な推薦
- 外部サービス双方向同期

## 4. 機能要件（FR）

| ID | 要件 |
| --- | --- |
| FR-01 | 入力をタスク/メモへ分類できること |
| FR-02 | 曖昧な場合、保存前に確認質問を返すこと |
| FR-03 | メモを `やりたいこと/アイデア/メモ（雑多）` に分類できること |
| FR-04 | タスクで期日未指定時に `設定する/設定しない/後で設定する` を提示すること |
| FR-05 | `設定する` 選択時のみ、自然言語で期日入力を受け付けること |
| FR-06 | `設定しない` は `no_due`、`後で設定する` は `pending_due` で保存すること |
| FR-07 | `pending_due` を一覧で `!期日設定` として強調し `no_due` と区別すること |
| FR-08 | 日付のみ期限は `default_due_time` を補完して `○/✕` 確認を返すこと |
| FR-09 | `○/✕` 確認で `✕` が選ばれた場合のみ自然言語補足入力を受け付けること |
| FR-10 | 期限は日時で保存し、日付のみ状態を残さないこと |
| FR-11 | `1時間前/30分前/前日` などのオフセット指示を解釈できること |
| FR-12 | オフセットまたは対象タスクが曖昧な場合、候補提示して `○/✕` 確認すること |
| FR-13 | 対象確認で `✕` が選ばれた場合のみ自然言語指定を受け付けること |
| FR-14 | 応答文はテンプレート固定で、`〇〇` 要約スロットのみ生成すること |
| FR-15 | `〇〇` は入力尊重で生成し、未確定情報を付与しないこと |
| FR-16 | 生成不適切時は deterministic フォールバックへ切り替えること |
| FR-17 | 通知をスケジュールし、通知タップで対象項目へ遷移できること |
| FR-18 | 送信は最小化し、用途/保存範囲を明示し、同意が必要な操作は同意取得後にのみ実行すること |
| FR-19 | 匿名デバイスIDを払い出し、インストール単位でデータ分離すること |
| FR-20 | Push購読情報を保存し、有効な購読先へ配信できること |
| FR-21 | 監査ログを最小限（入力/応答/時刻）で保持できること |
| FR-22 | `/v1/chat/messages` は入力制御メタ（`inputMode`/`confirmationType`/`negativeChoice`）を返せること |
| FR-23 | `task_or_memo` で `メモ` が選択された場合、保存前に `memo_category` 確認を必須にすること |
| FR-24 | 文体設定 `responseTone`（`polite/friendly/concise`）を受け取り、応答文へ反映できること |
| FR-25 | 文体設定は端末ローカル保持とし、サーバー永続化しないこと |

## 5. データ要件

### 5.1 Task

- `id`, `installationId`, `title`, `kind`, `memoCategory`
- `dueState`, `dueAt`, `defaultDueTimeApplied`, `status`
- `createdAt`, `updatedAt`

### 5.2 Reminder

- `id`, `taskId`, `baseTime`, `offsetMinutes`, `notifyAt`, `status`
- `createdAt`, `updatedAt`

### 5.3 Conversation Context

- `installationId`, `pendingType`, `candidateTaskIds`
- `proposedDueAt`, `proposedOffsetMinutes`, `expiresAt`
- `payload`, `updatedAt`

### 5.4 クラウドテーブル

- `installations`
- `tasks`
- `reminders`
- `conversation_contexts`
- `push_subscriptions`
- `chat_audit_logs`

## 6. API要件

- POST `/v1/installations/register`
- POST `/v1/chat/messages`
- POST `/v1/push/subscribe`
- POST `/v1/tasks/:id/reclassify`
- POST `/v1/reminders/:id/adjust-offset`
- GET `/v1/tasks`
- GET `/v1/reminders/upcoming`

### 6.1 ChatRequest（追記）

- `text?: string`
- `selectedChoice?: string`
- `defaultDueTime?: string`
- `responseTone?: "polite" | "friendly" | "concise"`（未指定時 `polite`）

### 6.2 ChatMessageResponse（追記）

- `assistantText: string`
- `summarySlot: string`
- `actionType: "saved" | "confirm" | "error"`
- `quickChoices: string[]`
- `affectedTaskIds: string[]`
- `inputMode?: "free_text" | "choice_only" | "choice_then_text_on_negative"`
- `confirmationType?: "task_or_memo" | "memo_category" | "due_choice" | "due_time_confirm" | "task_target_confirm" | null`
- `negativeChoice?: string | null`

### 認可

- `register` 以外は `accessToken` によるインストール単位認可

## 7. 日時解釈ポリシー（P1改訂）

- `OPENAI_DUE_PARSE_MODE` で `ai-first / rule-first / rule-only` を切り替える
- 既定は `ai-first`
- `ai-first` では AIが `resolved` 以外を返した場合、自動保存せず確認質問へ戻す
- AI結果は厳格検証（ISO妥当性、必須項目、過去日時）を通過した場合のみ採用する
- 検証失敗は `needs_confirmation` と同等に扱う

## 8. 応答文ポリシー（P2-01改訂）

- 文体は `polite/friendly/concise` の3種
- 既定は `polite`
- 文面選択は決定論ローテーション（seed）で再現可能にする
- 文体設定は端末ローカル保持し、毎回 `/v1/chat/messages` に送る
- サーバー側は文体設定を保存しない

## 9. 非機能要件（NFR）

- 性能: 入力開始から保存完了5秒以内を80%以上で達成
- 品質: タスク/メモ修正率20%以下、メモ内25%以下
- 通知品質: リマインド調整成功率95%以上
- 可用性: 主要機能はネットワーク一時不安定時にも再試行可能であること
- プライバシー: 目的限定・最小送信を遵守すること

## 10. KPI

- 5秒以内保存率 80%以上
- タスク/メモ修正率 20%以下
- メモ内修正率 25%以下
- リマインド調整成功率 95%以上
- 通知後10分以内確認率 70%以上

## 11. 主要受け入れ基準

- `UC-02`: 期日未指定タスクで3択が表示される
- `UC-08`: 日付のみ入力で `○/✕` が表示される
- `UC-14`: `1時間前` が通知時刻へ正しく反映される
- `UC-16`: `pending_due` が `!期日設定` で表示される
- `UC-17`: 対象曖昧時に `対象タスクは〇〇で良いですか？` を返す
- `UC-19`: ユーザー操作起点でPush購読保存が成功する
- `UC-20`: GPT要約失敗時にフォールバック応答が返る
- `UC-P1-01`: `choice_only` では自由入力不可
- `UC-P1-02`: `choice_then_text_on_negative` では `✕` 後のみ自由入力可能
- `UC-P1-03`: AI日時解釈の検証失敗時に確認フローへ戻る
- `UC-P2-01`: 文体設定変更後、保存/確認/エラー応答のトーンが切り替わる
- `UC-P2-02`: `タスク/メモ` で `メモ` 選択時は、カテゴリ選択前に自動保存されない

## 12. v0.1 回帰チェック観点

- `明日18時に洗濯` はタイトル `洗濯` で保存される
- `〜たい` 系入力は `memo(want)` を維持する
- `転職準備` は即保存せずタスク/メモ確認を返す
- `タスク/メモ` で `メモ` を選択した場合は、カテゴリ確認後にのみ保存される

## 13. リリース条件

- `Backlog_v0.2.md` のP0が完了
- 主要単体/結合/E2Eテストが緑化
- Push購読と通知導線が実機で動作
- ドキュメント (`Documents/*_v0.2.md`) と Issue定義 (`Issues/*_v0.2.md`) が同期している
