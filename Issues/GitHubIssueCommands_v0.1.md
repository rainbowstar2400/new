# GitHub Issue Commands v0.1

- 作成日: 2026-02-06
- 使い方: `<OWNER/REPO>` を実際のリポジトリに置き換えて実行
- 参照: `GitHubIssues_v0.1.md`

## Commands

```powershell
gh issue create --repo "https://github.com/rainbowstar2400/new" --title "[P0-01] ドメインモデル定義" --label "priority:P0" --label "type:Data" --label "milestone:MVP-v0.1" --body "See GitHubIssues_v0.1.md: [P0-01]"
gh issue create --repo "https://github.com/rainbowstar2400/new" --title "[P0-02] ローカル永続化実装" --label "priority:P0" --label "type:Infra" --label "milestone:MVP-v0.1" --body "See GitHubIssues_v0.1.md: [P0-02]"
gh issue create --repo "https://github.com/rainbowstar2400/new" --title "[P0-03] 入力分類エンジン" --label "priority:P0" --label "type:Backend" --label "milestone:MVP-v0.1" --body "See GitHubIssues_v0.1.md: [P0-03]"
gh issue create --repo "https://github.com/rainbowstar2400/new" --title "[P0-04] メモ内サブ分類" --label "priority:P0" --label "type:Backend" --label "milestone:MVP-v0.1" --body "See GitHubIssues_v0.1.md: [P0-04]"
gh issue create --repo "https://github.com/rainbowstar2400/new" --title "[P0-05] 登録入力UI" --label "priority:P0" --label "type:UI" --label "milestone:MVP-v0.1" --body "See GitHubIssues_v0.1.md: [P0-05]"
gh issue create --repo "https://github.com/rainbowstar2400/new" --title "[P0-06] 期日3択確認UI" --label "priority:P0" --label "type:UI" --label "milestone:MVP-v0.1" --body "See GitHubIssues_v0.1.md: [P0-06]"
gh issue create --repo "https://github.com/rainbowstar2400/new" --title "[P0-07] 期日3択分岐処理" --label "priority:P0" --label "type:Logic" --label "milestone:MVP-v0.1" --body "See GitHubIssues_v0.1.md: [P0-07]"
gh issue create --repo "https://github.com/rainbowstar2400/new" --title "[P0-08] !期日設定 表示" --label "priority:P0" --label "type:UI" --label "milestone:MVP-v0.1" --body "See GitHubIssues_v0.1.md: [P0-08]"
gh issue create --repo "https://github.com/rainbowstar2400/new" --title "[P0-09] 日付のみ期限の ○/✕ 確認UI" --label "priority:P0" --label "type:UI" --label "milestone:MVP-v0.1" --body "See GitHubIssues_v0.1.md: [P0-09]"
gh issue create --repo "https://github.com/rainbowstar2400/new" --title "[P0-10] ○/✕ 時刻確定分岐" --label "priority:P0" --label "type:Logic" --label "milestone:MVP-v0.1" --body "See GitHubIssues_v0.1.md: [P0-10]"
gh issue create --repo "https://github.com/rainbowstar2400/new" --title "[P0-11] 期日自然言語解釈" --label "priority:P0" --label "type:Logic" --label "milestone:MVP-v0.1" --body "See GitHubIssues_v0.1.md: [P0-11]"
gh issue create --repo "https://github.com/rainbowstar2400/new" --title "[P0-12] ローカル通知基盤" --label "priority:P0" --label "type:Reminder" --label "milestone:MVP-v0.1" --body "See GitHubIssues_v0.1.md: [P0-12]"
gh issue create --repo "https://github.com/rainbowstar2400/new" --title "[P0-13] オフセット解釈エンジン" --label "priority:P0" --label "type:Reminder" --label "milestone:MVP-v0.1" --body "See GitHubIssues_v0.1.md: [P0-13]"
gh issue create --repo "https://github.com/rainbowstar2400/new" --title "[P0-14] 対象曖昧時 ○/✕ 確認" --label "priority:P0" --label "type:UI" --label "milestone:MVP-v0.1" --body "See GitHubIssues_v0.1.md: [P0-14]"
gh issue create --repo "https://github.com/rainbowstar2400/new" --title "[P0-15] 応答テンプレート + 要約スロット" --label "priority:P0" --label "type:NLG" --label "milestone:MVP-v0.1" --body "See GitHubIssues_v0.1.md: [P0-15]"
gh issue create --repo "https://github.com/rainbowstar2400/new" --title "[P0-16] 応答フォールバック制御" --label "priority:P0" --label "type:NLG" --label "milestone:MVP-v0.1" --body "See GitHubIssues_v0.1.md: [P0-16]"
gh issue create --repo "https://github.com/rainbowstar2400/new" --title "[P0-17] P0総合テスト" --label "priority:P0" --label "type:Test" --label "milestone:MVP-v0.1" --body "See GitHubIssues_v0.1.md: [P0-17]"
gh issue create --repo "https://github.com/rainbowstar2400/new" --title "[P1-01] 時刻未指定リマインド改善" --label "priority:P1" --label "type:Reminder" --label "milestone:MVP-v0.1" --body "See GitHubIssues_v0.1.md: [P1-01]"
gh issue create --repo "https://github.com/rainbowstar2400/new" --title "[P1-02] 相対日付解釈精度強化" --label "priority:P1" --label "type:Logic" --label "milestone:MVP-v0.1" --body "See GitHubIssues_v0.1.md: [P1-02]"
gh issue create --repo "https://github.com/rainbowstar2400/new" --title "[P1-03] 確認UIの操作性改善" --label "priority:P1" --label "type:UX" --label "milestone:MVP-v0.1" --body "See GitHubIssues_v0.1.md: [P1-03]"
gh issue create --repo "https://github.com/rainbowstar2400/new" --title "[P2-01] 応答文チューニング" --label "priority:P2" --label "type:NLG" --label "milestone:MVP-v0.1" --body "See GitHubIssues_v0.1.md: [P2-01]"
gh issue create --repo "https://github.com/rainbowstar2400/new" --title "[P2-02] 境界ケース拡張" --label "priority:P2" --label "type:Logic" --label "milestone:MVP-v0.1" --body "See GitHubIssues_v0.1.md: [P2-02]"
gh issue create --repo "https://github.com/rainbowstar2400/new" --title "[P2-03] 一覧画面微調整" --label "priority:P2" --label "type:UX" --label "milestone:MVP-v0.1" --body "See GitHubIssues_v0.1.md: [P2-03]"
```
