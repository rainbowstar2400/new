# GitHub Issue Commands v0.3

- 作成日: 2026-02-15
- 対象リポジトリ: `rainbowstar2400/new`
- 参照: `Issues/GitHubIssues_v0.3.md`

## 1. 前提

- `gh auth login` 済み
- `gh` がPATHに通っている

## 2. ラベル/マイルストーン準備（PowerShell）

```powershell
$repo = "rainbowstar2400/new"

# labels
gh label create "priority:P1" --color fbca04 --description "Important" --repo $repo
gh label create "priority:P2" --color 0e8a16 --description "Quality improvement" --repo $repo
gh label create "type:UI" --color bfdadc --description "Frontend UI" --repo $repo
gh label create "type:UX" --color f9d0c4 --description "UX improvement" --repo $repo
gh label create "type:Logic" --color c2e0c6 --description "Domain logic" --repo $repo
gh label create "milestone:MVP-v0.3" --color 0052cc --description "Online MVP v0.3" --repo $repo
```

## 3. 単体起票テンプレート（PowerShell）

```powershell
$repo = "rainbowstar2400/new"

$body = @"
## Summary
モバイル下部タブUIを全面刷新する。

## Scope
- チャット/メモ・タスク/設定の3タブ
- 下部固定ナビ
- タブ/フィルタ復元
- ?taskId= 深リンク

## Acceptance Criteria
- UC-30〜UC-35
- FR-26〜FR-32

## Dependencies
- なし

## References
- Documents/PRD_v0.3.md
- Documents/UseCases_v0.3.md
- Documents/Backlog_v0.3.md
"@

gh issue create `
  --repo $repo `
  --title "[P1-01] モバイル下部タブUI全面刷新" `
  --label "priority:P1" `
  --label "type:UI" `
  --label "milestone:MVP-v0.3" `
  --body $body
```

## 4. v0.3 一括起票例（PowerShell）

```powershell
$repo = "rainbowstar2400/new"

$items = @(
  @{ id = "P1-01"; title = "モバイル下部タブUI全面刷新"; pr = "P1"; type = "UI" },
  @{ id = "P2-01"; title = "分類境界ケース拡張"; pr = "P2"; type = "Logic" },
  @{ id = "P2-02"; title = "一覧画面微調整"; pr = "P2"; type = "UX" }
)

foreach ($item in $items) {
  $body = @"
## Summary
See Documents/Backlog_v0.3.md: [$($item.id)]

## Scope
See Documents/Backlog_v0.3.md

## Acceptance Criteria
See Documents/PRD_v0.3.md + Documents/UseCases_v0.3.md

## References
- Documents/PRD_v0.3.md
- Documents/UseCases_v0.3.md
- Documents/Backlog_v0.3.md
"@

  gh issue create `
    --repo $repo `
    --title "[$($item.id)] $($item.title)" `
    --label "priority:$($item.pr)" `
    --label "type:$($item.type)" `
    --label "milestone:MVP-v0.3" `
    --body $body
}
```
