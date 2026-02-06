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
- 期日3択フロー
- 日付のみ期限の既定時刻補完 + `○/✕`
- オフセット調整
- 対象曖昧時の `○/✕` 確認
- 応答テンプレート + GPT要約スロット + フォールバック
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

### 認可

- `register` 以外は `accessToken` によるインストール単位認可

## 7. 非機能要件（NFR）

- 性能: 入力開始から保存完了5秒以内を80%以上で達成
- 品質: タスク/メモ修正率20%以下、メモ内25%以下
- 通知品質: リマインド調整成功率95%以上
- 可用性: 主要機能はネットワーク一時不安定時にも再試行可能であること
- プライバシー: 目的限定・最小送信を遵守すること

## 8. KPI

- 5秒以内保存率 80%以上
- タスク/メモ修正率 20%以下
- メモ内修正率 25%以下
- リマインド調整成功率 95%以上
- 通知後10分以内確認率 70%以上

## 9. 主要受け入れ基準

- `UC-02`: 期日未指定タスクで3択が表示される
- `UC-08`: 日付のみ入力で `○/✕` が表示される
- `UC-14`: `1時間前` が通知時刻へ正しく反映される
- `UC-16`: `pending_due` が `!期日設定` で表示される
- `UC-17`: 対象曖昧時に `対象タスクは〇〇で良いですか？` を返す
- `UC-19`: ユーザー操作起点でPush購読保存が成功する
- `UC-20`: GPT要約失敗時にフォールバック応答が返る

## 10. リリース条件

- `Backlog_v0.2.md` のP0が完了
- 主要単体/結合/E2Eテストが緑化
- Push購読と通知導線が実機で動作
- ドキュメント (`Documents/*_v0.2.md`) と Issue定義 (`Issues/*_v0.2.md`) が同期している

