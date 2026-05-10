# Simple Git View — Spec.md

## 概要

VSCode 拡張機能。git リポジトリの状態・履歴・差分を**見るだけ**のシンプルなツール。
機能を足さない設計を原則とする。

---

## 設計原則

- **表示特化** — git への書き込み操作は一切行わない
- **機能を足さない** — トグルやオン/オフ設定は原則設けない
- **外部ライブラリなし** — `child_process` で git コマンドを直接実行
- **個人利用** — Marketplace 公開なし、`.vsix` でローカルインストール

---

## 技術スタック

| 項目 | 内容 |
|---|---|
| 言語 | TypeScript |
| API | VSCode Extension API |
| git 実行 | `child_process.execSync` |
| diff 表示 | `vscode.diff()` （VSCode 標準） |
| アクティベート条件 | ワークスペースに `.git` が存在するとき |

---

## 機能仕様

### 1. サイドバー（Git Status）

- アクティビティバーに専用アイコンで常時表示
- 表示内容
  - 現在のブランチ名
  - 変更ファイルの一覧（ステータス付き: `M` / `A` / `?` など）
- ファイル保存時に自動更新

---

### 2. コミット履歴パネル

- コマンド `Git: Show Commit History` で Webview パネルを起動
- 表示カラム

  | カラム | 備考 |
  |---|---|
  | ハッシュ | 重複しない最短桁数で表示、残りは `...` で省略 |
  | コミットメッセージ | |
  | 著者 | |
  | 日時 | 相対表示（例: 2 days ago） |

- 表示件数: 直近 50 件
- 行クリック → そのコミットで変更されたファイル一覧をパネル下部に表示

---

### 3. ファイル履歴 → 差分表示

- コミットのファイル一覧からファイルを選択
  → **そのファイル単体のコミット履歴**に絞り込んで表示
- ファイル履歴の行をクリック
  → VSCode 標準の**左右分割 diff ビューア**で差分を表示（変更前 / 変更後）

#### 画面遷移

```
コミット履歴一覧
  └─ 行クリック
       └─ 変更ファイル一覧（パネル下部）
            └─ ファイルクリック
                 └─ そのファイルのコミット履歴
                      └─ 行クリック
                           └─ 左右 diff 表示（VSCode 標準）
```

---

### 4. Blame 表示

- **常時表示**（トグルなし）
- 開いているファイルの各行末尾に、ゴーストテキストで表示
  - 表示内容: `著者: コミットメッセージ`
  - 色: グレー系（`editorCodeLens.foreground` に準拠）
  - フォントスタイル: italic
- エディタ切り替え時に自動再適用

---

## ファイル構成（実装時の参考）

```
simple-git-view/
├── package.json
├── tsconfig.json
└── src/
    ├── extension.ts        # エントリポイント・コマンド登録
    ├── gitService.ts       # git コマンド実行・データ取得
    ├── sidebarProvider.ts  # サイドバー TreeView
    ├── historyPanel.ts     # コミット履歴 Webview パネル
    └── blameDecoration.ts  # Blame ゴーストテキスト
```

---

## コマンド一覧

| コマンド ID | タイトル | 起動方法 |
|---|---|---|
| `simpleGitView.showHistory` | Git: Show Commit History | コマンドパレット |

---

## 対象環境

- VSCode 1.85.0 以上
- `.git` が存在するワークスペース
- インストール: `code --install-extension simple-git-view-*.vsix`