# new

オンラインMVP（v0.2）として、会話入力ベースの秘書アプリを実装するモノレポです。

## リポジトリ構成

- `apps/web`: Vite + React + TypeScript PWA
- `apps/api`: Fastify + PostgreSQL API
- `packages/shared`: 共通型・分類/日時/要約ロジック
- `infra`: DBマイグレーション、運用メモ
- `Documents`: 仕様書
- `Issues`: Issue下書きと`gh`コマンド

## 開発フロー（安全運用）

1. `pnpm preflight` を実行して対象リポジトリを検証
2. `pnpm dev` で Web/API を並列起動
3. `pnpm test` で単体・結合テストを実行

## 主なコマンド

```bash
pnpm preflight
pnpm dev
pnpm dev:api
pnpm dev:web
pnpm test
pnpm build
```

## 環境変数

`.env.example` をコピーして `.env` を作成してください。

- API: `DATABASE_URL`, `OPENAI_API_KEY`, `WEB_PUSH_*`
- Web: `VITE_API_BASE_URL`, `VITE_WEB_PUSH_PUBLIC_KEY`

## 仕様ドキュメント

- `Documents/ProductBrief_v0.2.md`
- `Documents/UseCases_v0.2.md`
- `Documents/PRD_v0.2.md`
- `Documents/Backlog_v0.2.md`

## 実装対象API

- `POST /v1/installations/register`
- `POST /v1/chat/messages`
- `POST /v1/push/subscribe`
- `POST /v1/tasks/:id/reclassify`
- `POST /v1/reminders/:id/adjust-offset`
- `GET /v1/tasks`
- `GET /v1/reminders/upcoming`
