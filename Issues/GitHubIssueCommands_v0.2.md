# GitHub Issue Commands v0.2

## 前提

- `gh auth login` 済み
- 対象リポジトリ: `rainbowstar2400/new`

## ラベル作成

```bash
gh label create "priority:P0" --color ff0000 --description "Must for MVP"
gh label create "type:API" --color 0052cc --description "API implementation"
gh label create "type:Backend" --color 1d76db --description "Backend logic"
gh label create "type:UI" --color 5319e7 --description "Frontend UI"
gh label create "type:Reminder" --color fbca04 --description "Notification/reminder"
gh label create "type:NLG" --color c2e0c6 --description "LLM/NLG"
gh label create "type:Test" --color 0e8a16 --description "Testing"
gh label create "milestone:MVP-v0.2" --color 5319e7 --description "Online MVP"
```

## Issue作成例

```bash
gh issue create \
  --repo rainbowstar2400/new \
  --title "[P0-19] チャットAPI実装" \
  --label "priority:P0" \
  --label "type:API" \
  --label "milestone:MVP-v0.2" \
  --body "## Summary\n会話入力を処理する /v1/chat/messages を実装\n\n## Scope\n- 分類\n- 期日確認\n- オフセット調整\n\n## Acceptance Criteria\n- UC-02/08/13/14/17 を満たす"
```
