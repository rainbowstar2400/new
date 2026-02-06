# 実機テスト手順 v0.1

## 1. 起動準備（PC側）

### Terminal 1: API
```powershell
cd C:\Users\cs24035\Documents\develop\new
pnpm preflight
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
$env:ALLOW_MEMORY_REPO="1"
$env:PORT="8787"
pnpm --filter @new/api dev
```

### Terminal 2: Web
```powershell
cd C:\Users\cs24035\Documents\develop\new
pnpm preflight
pnpm --filter @new/web dev -- --host 0.0.0.0 --port 5174
```

### Terminal 3: Tunnel
```powershell
ngrok http 5174 --log=stdout
```

## 2. 接続確認（PC）

1. `http://localhost:5174` が開ける。
2. `POST http://localhost:5174/v1/installations/register` で `installationId` が返る。
3. `https://<ngrok-url>` でWebが開ける。
4. `POST https://<ngrok-url>/v1/installations/register` で `installationId` が返る。

## 3. iPhoneでの基本確認

1. Safariで `https://<ngrok-url>` を開く。
2. 初回表示でチャットUIが表示される。
3. 画面操作時にクラッシュや真っ白画面がない。

## 4. 主要フロー確認（会話入力）

1. タスク入力（例: `明日17時に資料提出`）でタスク登録される。
2. メモ入力（例: `最近読んだ本の感想を残しておきたい`）でメモ登録される。
3. 曖昧入力で「タスク or メモ確認」が返る。
4. メモ分類（`やりたいこと` / `アイデア` / `メモ(雑多)`）が想定どおりになる。

## 5. 期日確認フロー

1. 期日未指定タスクで `設定する` / `設定しない` / `後で設定する` が出る。
2. `設定する` 選択時のみ自然言語入力で期日を受ける。
3. 日付のみ指定時に `○` / `✕` で時刻確認が出る。
4. `後で設定する` は一覧で `!期日設定` 強調表示される。

## 6. リマインド調整

1. `1時間前にリマインドして` などのオフセット指示が解釈される。
2. 対象曖昧時は `対象タスクは〇〇で良いですか？` の確認が出る。

## 7. Push通知（iOS PWA）

1. ユーザー操作起点で通知許可を要求する。
2. 許可後、近い時刻の通知を登録して受信できる。
3. 通知タップでアプリが開き、対象タスクに遷移できる。

## 8. 合格基準（MVP）

1. 入力から保存まで5秒以内（体感でも可、可能なら計測）。
2. 主要シナリオで500エラーが発生しない。
3. 誤分類時に再分類フローで修正できる。
4. オフセット調整が成功する。

## 9. 実機フィードバック反映済み（2026-02-07）

1. 日時解釈の改善: `明日15時` などの入力で時刻が 00:00 にならず、指定時刻で保存される。
2. 願望表現の分類改善: `〜たい`（例: `京都にいきたい`）を `メモ / やりたいこと` として分類できる。
3. 短文タスクの分類改善: `洗濯` のような短い入力をタスクとして解釈できる。
4. タスク名整形: `明日18時に洗濯` はタスク名を `洗濯` として保存する。
5. メモ分類確認フロー追加: 曖昧入力で `メモ` 選択時、`やりたいこと / アイデア / メモ（雑多）` を選択してから保存する。
