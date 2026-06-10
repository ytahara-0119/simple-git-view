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

## アップデート（ローカル再インストール）

最新コードを取り込んで拡張機能を更新する場合、以下のコマンドを一発で実行する。

```bash
cd /path/to/simple-git-view && git checkout main && git pull && npm run compile && npx vsce package && code --install-extension simple-git-view-0.0.1.vsix --force
```

| ステップ | 内容 |
|---|---|
| `git checkout main` | main ブランチに切り替え |
| `git pull` | リモートの最新コードを取得 |
| `npm run compile` | TypeScript をコンパイル |
| `npx vsce package` | `.vsix` パッケージを生成 |
| `code --install-extension ... --force` | VS Code に強制上書きインストール |

インストール後に VS Code を再読み込み（`Developer: Reload Window`）すると新バージョンが反映される。

## 使い方

### 起動方法

- StatusBar 右側の `🌸 <branch>` をクリック
- コマンドパレット → `Git View: Show Commit History`
- 現在編集中のファイルの履歴: `Git View: Show File History`
  （エディタタイトルメニュー / エディタ右クリックメニューからも起動可能）

### キーボードショートカット

#### コミット履歴パネル

| キー | 動作 |
|---|---|
| ↑ / ↓ / j / k | コミット一覧を移動 |
| Enter | 変更ファイル一覧にフォーカス |
| Space | コミットをマーク（再押下で解除）— 2コミット間 diff の基点 |
| m | マージコミット表示トグル（デフォルト非表示） |
| c | テーマを切り替える |

#### 変更ファイル一覧

| キー | 動作 |
|---|---|
| ↑ / ↓ / j / k | ファイルを移動し diff を更新 |
| Enter | diff スクロールモードへ |
| h | 選択ファイルの履歴を新規パネルで開く |
| Esc | コミット一覧に戻る |

#### diff スクロールモード

| キー | 動作 |
|---|---|
| ↑ / ↓ / j / k | 40px スクロール |
| PageUp / PageDown | 約 80% スクロール |
| Esc | 元の一覧（ファイル / コミット）に戻る |

フォーカス中は diff 表示領域に薄い枠線が出る。

#### ファイル履歴パネル

| キー | 動作 |
|---|---|
| ↑ / ↓ / j / k | コミットを移動し diff を更新 |
| Enter | diff スクロールモードへ |
| Space | コミットをマーク（再押下で解除）— 2コミット間 diff の基点 |
| m | マージコミット表示トグル |
| c | テーマを切り替える |
| q | パネルを閉じる（メインのコミット履歴に戻る） |

## コマンド一覧

| コマンド | 説明 |
|---|---|
| `Git View: Show Commit History` | コミット履歴 Webview を開く |
| `Git View: Show File History` | アクティブエディタのファイル履歴を開く |

## テーマカスタマイズ

ワークスペースの `.simple-git-view/themes/` フォルダに `.json` ファイルを配置すると、パネル起動時にカスタムテーマが読み込まれ `c` キーで切り替えられます。  
ファイルには `"schema": "simple-git-view.theme.v1"` フィールドが必要です（このフィールドを持たない JSON は無視されます）。

テーマファイルは [Morphous](https://morphous.app/) 形式から変換できます：

```bash
node scripts/morphous-to-sgv-theme.js path/to/morphous-theme.json
mkdir -p .simple-git-view/themes
cp path/to/generated.sgv-theme.json .simple-git-view/themes/
```

詳細は `scripts/README.md` を参照。

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
