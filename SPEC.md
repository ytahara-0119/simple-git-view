# Simple Git View — Spec.md

## 概要

VSCode 拡張機能。git リポジトリの状態・履歴・差分を**見るだけ**のシンプルなツール。
機能を足さない設計を原則とする。

---

## 設計原則

- **表示特化** — git への書き込み操作は一切行わない
- **機能を足さない** — トグルやオン/オフ設定は原則設けない
- **VSCode 標準と重複しない** — VSCode が標準で提供する UI（Source Control ビュー等）と機能重複する独自 UI は設けない
- **外部ライブラリなし** — `child_process` で git コマンドを直接実行
- **個人利用** — Marketplace 公開なし、`.vsix` でローカルインストール

---

## 技術スタック

| 項目 | 内容 |
|---|---|
| 言語 | TypeScript |
| API | VSCode Extension API |
| git 実行 | `child_process.execFile` / `execFileSync`（shell 経由しない） |
| diff 表示 | Webview パネル内インライン split diff（行番号付き） |
| webview スクリプト | 外部 JS ファイル（CSP nonce + `asWebviewUri`） |
| ブランチ表示 | StatusBar Item |
| アクティベート条件 | ワークスペースに `.git` が存在するとき |

---

## 機能仕様

本拡張が提供する独自価値は次の 3 つに絞る：

1. **StatusBar ブランチ表示**（クリックで履歴を開く動線）
2. **コミット履歴 Webview**（split diff + キーボードナビゲーション）
3. **Blame ゴーストテキスト**（常時表示）

変更ファイル一覧の表示は VSCode 標準の Source Control ビューに任せる（独自実装しない）。

---

### 1. StatusBar ブランチ表示

- VSCode 画面下部の StatusBar 右側に常時表示
- 表示内容: `🌸 <ブランチ名>`
- クリック → コミット履歴 Webview を開く（`simpleGitView.showHistory` を実行）
- tooltip: Markdown 形式で **Simple Git View** + 「Click: Show commit history」+「`⌘⇧P` → `Git View` for all commands」を表示
- 更新タイミング:
  - 拡張機能 activate 時
  - `.git/HEAD` の変更を検出したとき（`FileSystemWatcher` で監視）
- ブランチ取得に失敗したときは StatusBar Item を非表示にする

---

### 2. コミット履歴パネル

- コマンド `Git View: Show Commit History` または StatusBar Item クリックで Webview パネルを起動（起動時の自動表示は行わない）
- 表示カラム

  | カラム | 備考 |
  |---|---|
  | ハッシュ | 先頭 7 文字 |
  | コミットメッセージ | |
  | 変更（+N -N） | 追加行数（緑）/ 削除行数（赤） |
  | 著者 | |
  | 日時 | `YYYY-MM-DD HH:mm` 形式の絶対日時 |

- 表示件数: 直近 50 件（※ マージコミットはデフォルト非表示。`m` キーで表示切替）
- パネル起動直後に先頭コミットを自動選択
- 行クリック / ↑↓キー → 選択行をハイライトし、変更ファイル一覧をパネル下部に表示
- Enter キー → 変更ファイル一覧の先頭にフォーカス移動（ファイル読み込み後に自動フォーカス）

#### キーボードショートカット（コミット一覧）

| キー | 動作 |
|---|---|
| ↑ / ↓ / j / k | コミット一覧を移動 |
| Enter | 変更ファイル一覧の先頭へフォーカス |
| Space | 現在のコミットをマーク（2コミット間 diff の基点を設定、再押下で解除） |
| m | マージコミット表示トグル（デフォルト非表示） |
| c | テーマを切り替える |

---

### 3. 変更ファイル一覧 → インライン diff

- コミット選択後、パネル下部に変更ファイル一覧を表示
- ファイルクリック / ↑↓キー → そのファイルの diff をパネル内にインライン表示
- diff 表示仕様
  - 左右分割テーブル（削除行: 赤背景 / 追加行: 緑背景 / コンテキスト行: 無色）
  - 各行に行番号を表示
  - 構文ハイライトは行わない（VSCode テーマの foreground で単色表示）
- `h` キー → そのファイル単体のコミット履歴を新規パネルで開く
- Escape キー → コミット一覧にフォーカスを戻す

#### キーボードショートカット（変更ファイル一覧）

| キー | 動作 |
|---|---|
| ↑ / ↓ / j / k | ファイルを移動し diff を更新 |
| Enter | diff スクロールモードへ |
| h | 選択ファイルの履歴パネルを開く |
| Escape | コミット一覧に戻る |

#### diff スクロールモード

変更ファイル一覧またはファイル履歴パネルで Enter を押すと、diff 表示領域にフォーカスが移り「diff スクロールモード」に入る。

- フォーカス時は diff 領域に薄い枠線を表示
- `↑` / `↓` / `j` / `k`: 40px スクロール
- `PageUp` / `PageDown`: 約 80%（ページ単位）スクロール
- `Escape`: 元の一覧（変更ファイル一覧 / ファイル履歴一覧）にフォーカスを戻す

---

### 4. ファイル履歴パネル（h キーで起動）

- 選択ファイル単体のコミット履歴を新規 Webview パネルで表示（直近 50 件、マージコミットはデフォルト非表示）
- パネル起動時に先頭コミットを自動選択し diff を表示
- 行クリック / ↑↓キー → そのコミットにおける選択ファイルの diff をパネル内にインライン表示
- diff 表示仕様はセクション 3 と同一（行番号あり、構文ハイライトなし）

#### キーボードショートカット（ファイル履歴一覧）

| キー | 動作 |
|---|---|
| ↑ / ↓ / j / k | コミットを移動し diff を更新 |
| Space | 現在のコミットをマーク（2コミット間 diff の基点を設定、再押下で解除） |
| Enter | diff スクロールモードへ |
| m | マージコミット表示トグル |
| c | テーマを切り替える |
| q | パネルを閉じる（メインのコミット履歴パネルにフォーカスを戻す） |

diff スクロールモードの挙動はセクション 3 と同一。

#### 画面遷移

```
StatusBar [$(git-branch) main]
  └─ クリック
       └─ コミット履歴 Webview
             └─ 行クリック / ↑↓
                  └─ 変更ファイル一覧（パネル下部）
                       ├─ ファイルクリック / ↑↓
                       │    └─ インライン split diff（行番号付き）
                       │         └─ Enter → diff スクロールモード（Esc で戻る）
                       └─ h キー
                            └─ ファイル履歴パネル（新規タブ）
                                 ├─ 行クリック / ↑↓
                                 │    └─ インライン split diff
                                 │         └─ Enter → diff スクロールモード（Esc で戻る）
                                 └─ q キー
                                      └─ パネルを閉じてコミット履歴に戻る
```

---

### 5. Blame 表示

- **常時表示**（トグルなし）
- **現在のカーソル行末尾に**ゴーストテキストで表示
  - 表示内容: `著者: コミットメッセージ`
  - 色: グレー系（`editorCodeLens.foreground` に準拠）
  - フォントスタイル: italic
- カーソル移動に応じて自動更新
- エディタ切り替え時に自動再適用
- ファイル単位でキャッシュし、保存（mtime 変更）時に再取得

---

### 6. カスタムテーマ

- デフォルトテーマとして `Figma Pink`（コミット履歴）と `File History Blue`（ファイル履歴）の 2 種を内蔵
- ワークスペースの `.simple-git-view/themes/` フォルダ内の `*.json` ファイルを起動時に自動読み込み（`schema: "simple-git-view.theme.v1"` フィールドを持つもののみ有効）
- `c` キーで次のテーマに切り替え（コミット履歴・ファイル履歴パネル間で同期）
- テーマ JSON スキーマ: `simple-git-view.theme.v1`（`scripts/README.md` 参照）
- Webview 再表示時にも現在テーマを維持（`onDidChangeViewState` で再送信）

---

## エラー UX

- git コマンド失敗時は VSCode の Output channel `Simple Git View` にエラー詳細を出力する
- ユーザー通知（`showErrorMessage`）は行わない（過剰通知を避ける）

---

## ファイル構成

```
simple-git-view/
├── package.json
├── tsconfig.json
├── .simple-git-view/
│   └── themes/               # カスタムテーマ JSON（*.sgv-theme.json）を配置
└── src/
    ├── extension.ts          # エントリポイント・コマンド登録
    ├── gitService.ts         # git コマンド実行・データ取得・Output channel
    ├── statusBarItem.ts      # StatusBar ブランチ表示
    ├── historyPanel.ts       # コミット履歴 Webview パネル（ホスト側）+ ファイル履歴パネル
    ├── themeLoader.ts        # テーマ定義・JSON 読み込み・CSS 変数生成
    ├── webviewMain.ts        # コミット履歴パネルのブラウザ側スクリプト
    ├── fileHistoryMain.ts    # ファイル履歴パネルのブラウザ側スクリプト
    └── blameDecoration.ts    # Blame ゴーストテキスト
```

---

## コマンド一覧

| コマンド ID | タイトル | 起動方法 |
|---|---|---|
| `simpleGitView.showHistory` | Git View: Show Commit History | コマンドパレット / StatusBar Item クリック |
| `simpleGitView.showFileHistory` | Git View: Show File History | コマンドパレット / エディタタイトルメニュー / エディタ右クリックメニュー |

---

## 提供しないもの（明示）

以下は VSCode 標準または他拡張で十分なため、本拡張では提供しない：

- 変更ファイル一覧のサイドバー TreeView（→ VSCode 標準 Source Control に委ねる）
- ブランチ切替・コミット作成などの書き込み操作（表示特化原則）
- Marketplace 公開・自動更新

---

## 対象環境

- VSCode 1.85.0 以上
- `.git` が存在するワークスペース
- インストール: `code --install-extension simple-git-view-*.vsix`
