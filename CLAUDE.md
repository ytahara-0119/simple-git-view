# CLAUDE.md

## プロジェクト概要
<!-- [要差し替え←差し替え済み: Human が実施] プロジェクト名・概要・仕様書ファイル名をここに記述する -->
本プロジェクトは VSCode 拡張機能 "Simple Git View" である。
git リポジトリの状態・履歴・差分を表示特化で提供するシンプルなツール。
仕様の正本は SPEC.md とする。

---

## 最重要ルール

- 仕様の正本は SPEC.md とする
- 実装・設計判断は必ず SPEC.md を参照する
- 仕様変更が必要な場合は、実装前に変更案を提示する
- MVPを最優先とし、過剰な抽象化を避ける
- 既存コードの変更は最小限にする
- issueごとの変更範囲を厳守する

---

## 開発方針
<!-- [要差し替え←差し替え済み: Human が実施] 使用言語・フレームワーク・DB・ツールをプロジェクトに合わせて書き換える -->

- 言語は TypeScript を使用する
- VSCode Extension API を使用する
- git 操作は child_process.execSync で直接実行する（外部ライブラリなし）
- diff 表示はパネル内インライン split diff を使用する（`vscode.diff()` は使用しない）
- パッケージ管理は npm を使用する
- 機能を足さない設計を原則とする（トグル・設定項目は原則設けない）
- **webview スクリプトは必ず外部 JS ファイルとして `out/` に配置し `asWebviewUri()` で読み込む**
  - VSCode の CSP はインラインスクリプトを nonce 付きでもブロックする場合があり、外部ファイル方式が唯一の確実な手段
  - `localResourceRoots` に `extensionUri/out` を指定し、`script-src 'nonce-...' ${csp}` を CSP に含める

---

## エージェント運用方針

このプロジェクトは以下の構成で進める：

- Supervisor（監督）
- Implementer（作業エージェント、並列起動可）

人間は Supervisor にのみ指示を出す。

---

## Supervisor の責務

- SPEC.md を読み、MVPを達成するための issue を分割する
- issueごとの依存関係を整理する
- 各 issue に対して branch 名、編集対象、完了条件を定義する
- `bash scripts/parallel-check.sh` で並列実行可能なグループを特定する
- グループ内の issue を **同時に** 複数 Implementer に委譲する（worktree 並列）
- issue 完了後に必ず人間確認で停止する
- 人間の承認後に次のグループに進む
- 最終的に進捗レポートを作成する

---

## Implementer の責務

- 指定された issue のみを実装する
- issue に記載された Editable Files を中心に変更する
- MVPに必要な最小実装を行う
- 完了条件を満たす
- 実装内容を簡潔に報告する
- **PR 作成前に issue の Acceptance Criteria と Definition of Done を全項目実行・確認する**
- 実装完了後に必ず Pull Request を作成する

---

## 実行ルール（重要）

Supervisor は以下の流れで進行すること：

1. SPEC.md を読む
2. issue を 5〜7 個に分割する
3. issues/issueXX.md を作成する
4. docs/workflow.md を必要に応じて更新する
5. `bash scripts/parallel-check.sh` で並列化可能グループを確認する
6. グループ内の issue を並列 Implementer に委譲する（→ 並列実行ルール参照）
7. 完了後、必ず停止して人間確認を求める
8. 承認後、次のグループに進む

## 並列実行ルール（重要）

Supervisor が Implementer を並列起動する際のルール：

- **並列化の条件**：依存 issue がすべて main にマージ済み、かつ Editable Files が重複しない
- **起動方法**：単一メッセージ内で複数の `Agent(isolation: "worktree")` を同時に呼び出す
- **各 Implementer** は独立した git worktree で作業するためファイル競合が発生しない
- **グループ完了後**：全 PR がマージされてから次のグループを起動する

```
# 並列起動の例（Supervisor がこの形で Agent を呼び出す）
Agent(isolation="worktree", prompt="issues/issue02.md を実装")   ┐ 同時
Agent(isolation="worktree", prompt="issues/issue03.md を実装")   ┘ 起動
```

## ブランチ運用ルール（重要）

- **ブランチは必ず最新の main から作成する**
- 依存 issue が複数ある場合は、それらを main にマージ済みであることを確認してから着手する
- **PR 作成前に Acceptance Criteria / Definition of Done を全項目確認する**（フックが自動チェック）
- issue 実装完了後は必ず Pull Request を作成する
- PR マージ後に main を更新してから次のグループに進む

---

## 禁止事項

- Editable Files が重複する issue を同時に並列実行させること
- 依存 issue が未マージのまま Implementer を起動すること
- MVP外の機能を先に実装すること
- issue を曖昧なまま作成すること
- 人間確認なしで連続実行すること
- **webview にインラインスクリプトを書くこと**（VSCode CSP により動作しない。必ず外部ファイル化すること）

---

## 実装優先順位
<!-- [要差し替え←差し替え済み: Human が実施] このプロジェクト固有の実装順序に書き換える -->

1. 環境構築（tsconfig / package.json / ディレクトリ構成）
2. gitService.ts（git コマンド実行・データ取得の共通層）
3. sidebarProvider.ts（ブランチ名・変更ファイル一覧）
4. blameDecoration.ts（Blame 常時表示）
5. historyPanel.ts（コミット履歴 Webview）
6. ファイル一覧表示（コミットクリック → 変更ファイル）
7. ファイル履歴表示（h キー → そのファイルの履歴パネル）
8. インライン split diff 表示（行番号・構文ハイライト付き、↑↓キーナビ）
9. .vsix パッケージ化・動作確認

---

## 成功条件

- issue単位で安全に実装が進む
- ファイル競合が発生しない
- 人間は最終確認のみ行う
- MVPが段階的に完成する