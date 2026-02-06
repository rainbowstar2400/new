# GitHub Issue Commands v0.2

- 作成日: 2026-02-07
- 対象リポジトリ: `rainbowstar2400/new`
- 参照: `Issues/GitHubIssues_v0.2.md`

## 1. 前提

- `gh auth login` 済み
- `gh` コマンドがPATHに通っていること

## 2. ラベル作成（PowerShell）

```powershell
gh label create "priority:P0" --color ff0000 --description "Must for MVP"
gh label create "priority:P1" --color fbca04 --description "Important after P0"
gh label create "priority:P2" --color 0e8a16 --description "Quality improvement"

gh label create "type:Data" --color 0052cc --description "Data model"
gh label create "type:Infra" --color 1d76db --description "Infrastructure"
gh label create "type:API" --color 0b3d91 --description "API implementation"
gh label create "type:Backend" --color 5319e7 --description "Backend service"
gh label create "type:Logic" --color c2e0c6 --description "Domain logic"
gh label create "type:UI" --color bfdadc --description "Frontend UI"
gh label create "type:Reminder" --color fef2c0 --description "Notification/reminder"
gh label create "type:NLG" --color d4c5f9 --description "LLM/NLG"
gh label create "type:Test" --color 0e8a16 --description "Testing"
gh label create "type:UX" --color f9d0c4 --description "UX improvement"
gh label create "type:Job" --color e99695 --description "Background job"

gh label create "milestone:MVP-v0.2" --color 5319e7 --description "Online MVP"
```

## 3. Issue作成テンプレート（PowerShell）

```powershell
$repo = "rainbowstar2400/new"

$body = @"
## Summary
会話入力を処理する /v1/chat/messages を実装する。

## Scope
- 分類
- 期日確認
- オフセット調整

## Acceptance Criteria
- UC-02/08/13/14/17 を満たす

## Dependencies
- P0-03
- P0-11

## References
- Documents/PRD_v0.2.md
- Documents/UseCases_v0.2.md
- Documents/Backlog_v0.2.md
"@

gh issue create `
  --repo $repo `
  --title "[P0-19] チャットAPI" `
  --label "priority:P0" `
  --label "type:API" `
  --label "milestone:MVP-v0.2" `
  --body $body
```

## 4. 複数Issue起票用の最小スクリプト例

```powershell
$repo = "rainbowstar2400/new"

$items = @(
  @{ id = "P0-18"; title = "匿名デバイス登録API"; pr = "P0"; type = "API" },
  @{ id = "P0-19"; title = "チャットAPI"; pr = "P0"; type = "API" },
  @{ id = "P0-20"; title = "Push購読API"; pr = "P0"; type = "API" },
  @{ id = "P0-21"; title = "通知配信ジョブ"; pr = "P0"; type = "Job" }
)

foreach ($item in $items) {
  $body = "See Issues/GitHubIssues_v0.2.md: [$($item.id)]"
  gh issue create `
    --repo $repo `
    --title "[$($item.id)] $($item.title)" `
    --label "priority:$($item.pr)" `
    --label "type:$($item.type)" `
    --label "milestone:MVP-v0.2" `
    --body $body
}
```
