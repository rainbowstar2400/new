# PRD v0.2

- 作成日: 2026-02-07
- 参照: `ProductBrief_v0.2.md`, `UseCases_v0.2.md`
- 対象: Online MVP

## 1. 機能スコープ

- 会話入力
- タスク/メモ分類
- メモ内サブ分類
- 期日3択フロー
- 日付のみ期限の既定時刻補完 + `○/✕`
- オフセット調整
- 対象曖昧時の `○/✕` 確認
- GPT要約スロット (`〇〇`) 生成 + フォールバック
- Web Push購読・配信

## 2. FR（更新）

- FR-01〜FR-17: v0.1継続
- FR-18 (更新):
  - 個人データ送信は目的限定で行う
  - 送信対象は最小化し、保存範囲を明示する
  - GPT送信は要約生成に必要な情報に限定する
  - Push配信は通知情報に限定する

## 3. データ要件（クラウド）

- installations
- tasks
- reminders
- conversation_contexts
- push_subscriptions
- chat_audit_logs

## 4. API

- POST `/v1/installations/register`
- POST `/v1/chat/messages`
- POST `/v1/push/subscribe`
- POST `/v1/tasks/:id/reclassify`
- POST `/v1/reminders/:id/adjust-offset`
- GET `/v1/tasks`
- GET `/v1/reminders/upcoming`

## 5. KPI

- 5秒以内保存率 80%以上
- タスク/メモ修正率 20%以下
- メモ内修正率 25%以下
- リマインド調整成功率 95%以上
- 通知後10分以内確認率 70%以上

## 6. 受け入れ基準（主要）

- UC-02: 期日未指定で3択
- UC-08: 日付のみ入力で `○/✕`
- UC-14: `1時間前` が反映
- UC-16: `!期日設定` 表示
- UC-17: 対象曖昧で `対象タスクは〇〇で良いですか？`

## 7. リリース条件

- P0チケット完了
- 主要E2E緑化
- Push購読と通知導線が動作
