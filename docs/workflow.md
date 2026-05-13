# docs/workflow.md

## Issue 一覧と状態

| Issue | タイトル | 依存 | 並列グループ | 状態 |
|-------|---------|------|------------|------|
| issue01 | 環境構築（package.json / tsconfig.json） | なし | Group 1 | 完了 |
| issue02 | gitService.ts — git コマンド共通層 | issue01 | Group 2 | 完了 |
| issue03 | sidebarProvider.ts — サイドバー TreeView | issue02 | Group 3 | 完了 |
| issue04 | blameDecoration.ts — Blame ゴーストテキスト | issue02 | Group 3 | 完了 |
| issue05 | historyPanel.ts — コミット履歴 + ファイル一覧 | issue02 | Group 3 | 完了 |
| issue06 | historyPanel.ts — ファイル履歴 + diff | issue05 | Group 4 | 完了 |
| issue07 | extension.ts 統合 + .vsix パッケージ化 | issue03, issue04, issue06 | Group 5 | 完了 |
| issue08 | UX 改善 — インライン split diff + キーボードナビ + 構文ハイライト | issue06 | Group 6 | 完了 |

---

## 並列実行グループ

```
Group 1: issue01  （環境構築）
    ↓
Group 2: issue02  （gitService.ts）
    ↓
Group 3: issue03 ┐
         issue04 ├── 並列実行可（Editable Files が重複しない）
         issue05 ┘
    ↓
Group 4: issue06  （historyPanel.ts に追記、issue05と同ファイルのため逐次）
    ↓
Group 5: issue07  （extension.ts 統合 + vsix）
    ↓
Group 6: issue08  （UX 改善 — インライン diff + キーボードナビ + 構文ハイライト）
    ↓
[UX レビュー] → UX Reviewer が問題を洗い出し、改善 issue を起票
    ↓
Group N: UX 改善 issue（複数）
```

---

## 依存関係

```
issue01
  └── issue02
        ├── issue03 ─────────────────────────────┐
        ├── issue04 ─────────────────────────────┤
        └── issue05                              │
              └── issue06                        │
                    └── issue07 ◄────────────────┘
```

---

## 基本フロー

1. 人間が Supervisor に指示する
2. Supervisor が issue を作成する
3. issue ごとに branch を定義する
4. Implementer が実装する（ブランチは必ず最新 main から作成）
5. 実装完了後に Pull Request を作成する
6. 人間が PR をレビュー・マージする
7. main を最新に更新してから次の issue に進む
8. 完了後、人間確認で停止

---

## UX レビューフロー

実装 Group 完了時など UI 変更があったタイミングで UX Reviewer を起動し、改善 issue を起票する。
**UX Reviewer の詳細な責務・観点・出力フォーマット・実行フローは [`agents/ux-reviewer.md`](../agents/ux-reviewer.md) を正本とする。**

### 起動タイミング

- 新しい UI が追加されたとき（Webview, TreeView, 通知など）
- UX に関わる issue が完了したとき
- 人間が「UX レビューして」と指示したとき

### 起動方法（Supervisor から）

```
Agent(
  subagent_type = "general-purpose",
  prompt = """
    agents/ux-reviewer.md の指示に従い、現在の実装を UX レビューしてください。
    レビュー結果は「問題 / なぜ問題か / 改善案 / 優先度」の形式で報告し、
    High 優先度の問題は issues/uxNN.md として起票してください。
  """
)
```

---

## ブランチ命名

| Issue | ブランチ名 |
|-------|-----------|
| issue01 | feature/issue01-env-setup |
| issue02 | feature/issue02-git-service |
| issue03 | feature/issue03-sidebar-provider |
| issue04 | feature/issue04-blame-decoration |
| issue05 | feature/issue05-history-panel-basic |
| issue06 | feature/issue06-history-panel-diff |
| issue07 | feature/issue07-extension-entry-vsix |
| ux改善 | feature/ux-<概要> |

---

## PR 作成ルール

- issue 実装完了後に必ず `gh pr create` で PR を作成する
- base ブランチは常に `main`
- PR タイトルは `feat(issueXX): <タイトル>` 形式
- **PR 作成前に Acceptance Criteria / Definition of Done の全項目を確認する**
- 未完了項目がある場合は PR を作成しない
- 次の issue に着手する前に依存 issue の PR が main にマージ済みであること

---

## issue 分割ルール

- 1 issue = 1責務
- 原則 1〜2ファイルのみ変更
- 横断変更は禁止

---

## 競合回避ルール

- 同一ファイルを複数 issue で編集しない
- 共通変更は最後にまとめる

---

## エージェント役割一覧

| 役割 | 定義ファイル | 責務 |
|------|------------|------|
| Supervisor | [`agents/supervisor.md`](../agents/supervisor.md) | issue 分割・依存整理・Implementer / UX Reviewer の起動・人間確認 |
| Implementer | [`agents/implementer.md`](../agents/implementer.md) | 指定 issue の実装・PR 作成 |
| UX Reviewer | [`agents/ux-reviewer.md`](../agents/ux-reviewer.md) | 実装の UX 評価・改善 issue の起票 |

---

## 人間の役割

- issue 完了時の確認のみ行う
- 設計の方向修正を行う
- バグ・仕様ズレの最終判断を行う
