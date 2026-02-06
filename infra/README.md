# インフラメモ（v0.2）

## PostgreSQL

`infra/migrations/001_init.sql` を順に適用してください。

```sql
\i infra/migrations/001_init.sql
```

## 必要環境変数

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (default: `gpt-4o-mini`)
- `WEB_PUSH_PUBLIC_KEY`
- `WEB_PUSH_PRIVATE_KEY`
- `WEB_PUSH_SUBJECT`

## Web Push VAPID鍵生成

```bash
npx web-push generate-vapid-keys
```

出力された公開鍵を `VITE_WEB_PUSH_PUBLIC_KEY` に、
秘密鍵を `WEB_PUSH_PRIVATE_KEY` に設定します。
