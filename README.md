# Simple Git View

VSCode 拡張機能。git リポジトリの状態・履歴・差分を**見るだけ**のシンプルなツール。

個人利用向け。Marketplace 公開はせず、`.vsix` でローカルインストールして使う。

## 特徴

- StatusBar にブランチ表示（クリックでコミット履歴を起動）
- コミット履歴 Webview（インライン split diff、キーボードナビゲーション）
- 変更行数（+N -N）と絶対日時を一覧表示
- マージコミットはデフォルト非表示（`m` キーで切替）
- 任意ファイルの履歴パネル（h キー / コマンド / 右クリック）
- 現在カーソル行の Blame ゴーストテキスト（常時表示）
- 表示特化（git への書き込み操作は一切なし）

## インストール

```bash
npm install
npm run compile
npx vsce package
code --install-extension simple-git-view-0.0.1.vsix --force
```

## 使い方

### 起動方法

- StatusBar 右側の `$(git-branch) <branch>` をクリック
- コマンドパレット → `Git View: Show Commit History`
- 現在編集中のファイルの履歴: `Git View: Show File History`
  （エディタタイトルメニュー / エディタ右クリックメニューからも起動可能）

### キーボードショートカット

#### コミット履歴パネル

| キー | 動作 |
|---|---|
| ↑ / ↓ | コミット一覧を移動 |
| Enter | 変更ファイル一覧にフォーカス |
| m | マージコミット表示トグル（デフォルト非表示） |
| Esc | 上位の領域にフォーカス |

#### 変更ファイル一覧

| キー | 動作 |
|---|---|
| ↑ / ↓ | ファイルを移動し diff を更新 |
| Enter | diff スクロールモードへ |
| h | 選択ファイルの履歴を新規パネルで開く |
| Esc | コミット一覧に戻る |

#### diff スクロールモード

| キー | 動作 |
|---|---|
| ↑ / ↓ | 40px スクロール |
| PageUp / PageDown | 約 80% スクロール |
| Esc | 元の一覧（ファイル / コミット）に戻る |

フォーカス中は diff 表示領域に薄い枠線が出る。

#### ファイル履歴パネル

| キー | 動作 |
|---|---|
| ↑ / ↓ | コミットを移動し diff を更新 |
| Enter | diff スクロールモードへ |
| m | マージコミット表示トグル |
| q | パネルを閉じる（メインのコミット履歴に戻る） |

## コマンド一覧

| コマンド | 説明 |
|---|---|
| `Git View: Show Commit History` | コミット履歴 Webview を開く |
| `Git View: Show File History` | アクティブエディタのファイル履歴を開く |

## 設計原則

- **表示特化** — git への書き込み操作は行わない
- **機能を足さない** — トグルや設定項目を増やさない
- **VSCode 標準と重複しない** — Source Control ビュー等が提供する機能は再実装しない
- **外部ライブラリなし** — git は `child_process` で直接実行

## 開発

```bash
npm run compile        # TypeScript コンパイル
npm run watch          # 監視モード
npx vsce package       # .vsix を作成
```

仕様の正本は [SPEC.md](./SPEC.md)。
