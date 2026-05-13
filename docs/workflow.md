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

実装 Group が完了するたびに UX Reviewer を起動し、改善 issue を起票する。

### 起動タイミング

- 新しい UI が追加されたとき（Webview, TreeView, 通知など）
- UX に関わる issue が完了したとき
- 人間が「UX レビューして」と指示したとき

### UX Reviewer の責務

UX Reviewer は Agent として起動し、現在の実装を調査した上で以下の観点で厳しめにレビューする。

| 観点 | 内容 |
|------|------|
| VSCode ネイティブらしさ | VSCode の標準 UX パターン（TreeView, QuickPick, StatusBar 等）から逸脱していないか |
| 初見ユーザーの迷い | 説明なしに操作方法が分かるか |
| 操作回数 | 目的の操作に到達するまでのステップ数が多すぎないか |
| 状態遷移の明瞭さ | 選択中・ローディング・エラー状態が視覚的に分かるか |
| ローディング / エラー UX | 重い処理中に何も表示されないままになっていないか |
| 情報量 | 情報過多 / 不足がないか |
| Discoverability | 機能の存在に気づけるか（キーバインド, ツールチップ, コマンドパレット等） |
| キーボード操作 | キーボードだけで主要操作が完結するか、Tab 順が自然か |
| Command Palette 連携 | よく使う操作がコマンドパレットから呼べるか |
| Sidebar / Webview の妥当性 | その情報を Sidebar または Webview で表示する必然性があるか |
| 「本当に必要？」 | そもそも不要な UI 要素・ステップが混入していないか |

### レビュー出力フォーマット

各問題を以下の形式で報告する：

```markdown
### [UX-NN] タイトル

- **問題**: （何が問題か）
- **なぜ問題か**: （ユーザーへの影響）
- **改善案**: （具体的な変更内容）
- **優先度**: High / Medium / Low
```

### UX Reviewer の起動プロンプトテンプレート

```
あなたは VSCode Extension の UX レビュアーです。
docs/workflow.md の「UX Reviewer の責務」に記載された観点で、
現在の実装（src/ 以下の全ファイル）を厳しめにレビューしてください。

レビュー対象:
- src/historyPanel.ts（Webview HTML / メッセージハンドラ）
- src/webviewMain.ts（Webview クライアント側スクリプト）
- src/fileHistoryMain.ts（ファイル履歴 Webview クライアント側）
- src/sidebarProvider.ts（サイドバー TreeView）
- src/blameDecoration.ts（Blame ゴーストテキスト）

各問題は「問題 / なぜ問題か / 改善案 / 優先度（High/Medium/Low）」の形式で出力してください。
UI 構成を大胆に変更する提案も歓迎します。
レビュー完了後、High 優先度の問題を issues/uxNN.md として起票してください。
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

| 役割 | 責務 |
|------|------|
| Supervisor | issue 分割・依存整理・Implementer / UX Reviewer の起動・人間確認 |
| Implementer | 指定 issue の実装・PR 作成 |
| UX Reviewer | 実装の UX 評価・改善 issue の起票 |

---

## 人間の役割

- issue 完了時の確認のみ行う
- 設計の方向修正を行う
- バグ・仕様ズレの最終判断を行う
