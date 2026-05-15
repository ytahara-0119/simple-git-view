# uxKK

## Issue ID
uxKK

## Title
SPEC.md を現状実装に合わせて全面更新 + README.md を新規作成

## Purpose
- 本拡張がここ数日で大きく進化（diff スクロールモード / マージトグル / 変更行数 / 絶対日時 / Show File History コマンド等）したのに、SPEC.md と README が追従していない
- 初見ユーザー / 自分が後から見返す用に、READMEで全体像とキー操作を一覧できるようにする

## Background
直近の変更履歴（要 SPEC 反映）：

- uxCC: Blame をカーソル行のみ表示（SPEC §5 はすでに反映済み）
- uxDD: `Git View: Show File History` コマンド追加（メニュー: editor/title, editor/context）
- uxEE: ファイル履歴を `q` で閉じる
- uxFF: q で閉じた後コミット履歴に reveal
- uxGG: 変更行数（+N -N）列追加 + 日時を `YYYY-MM-DD HH:mm` 表示
- uxHH: diff スクロールモード（Enter で diff にフォーカス → ↑↓/PgUp/PgDn → ESC で戻る）
- uxII: マージコミット非表示 + `m` キートグル

## Scope

### `SPEC.md` の更新
- §2 コミット履歴パネル: 表示カラムに **変更（+N -N）** を追加
- §2 キーボードショートカット表に追記：
  - `m` キー: マージコミット表示トグル
- §3 変更ファイル一覧 → インライン diff のショートカット表に追記：
  - `Enter`: diff スクロールモードに入る
- §3 / §4 に「diff スクロールモード」のセクションを新設：
  - フォーカス時の見た目（薄い枠線）
  - `↑↓`: 40px スクロール
  - `PageUp` / `PageDown`: 約 80% ページスクロール
  - `Escape`: 一覧にフォーカスを戻す
- §4 ファイル履歴パネルのキーボードショートカット表に追記：
  - `Enter`: diff スクロールモード
  - `q`: パネルを閉じる（直後にメイン履歴にフォーカスが戻る）
- §4 の画面遷移図を更新（h で開いたパネルからの q 動線を追加）
- §2 / §4 の表示件数記述: 「直近 50 件」のままで OK、ただし「マージコミットはデフォルト非表示（m で切替）」を追記
- コマンド一覧に `simpleGitView.showFileHistory` を追加
- ファイル構成は更新不要（変化なし）

### `README.md` を新規作成（プロジェクトルート）

構成案：

```markdown
# Simple Git View

VSCode 拡張機能。git リポジトリの状態・履歴・差分を**見るだけ**のシンプルなツール。

## 特徴

- StatusBar にブランチ表示（クリックで履歴）
- コミット履歴 Webview（split diff・キーボードナビゲーション）
- 現在カーソル行の Blame ゴーストテキスト
- 表示特化（git への書き込み一切なし）

## インストール

\`\`\`bash
npm install
npm run compile
npx vsce package
code --install-extension simple-git-view-0.0.1.vsix --force
\`\`\`

## 使い方

### 起動方法

- StatusBar 右側 `$(git-branch) <branch>` をクリック
- コマンドパレット → `Git View: Show Commit History`
- 現在のファイルの履歴: `Git View: Show File History`（エディタ右クリックメニューからも）

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
| Esc | 一覧（ファイル / コミット）に戻る |

#### ファイル履歴パネル
| キー | 動作 |
|---|---|
| ↑ / ↓ | コミットを移動し diff を更新 |
| Enter | diff スクロールモードへ |
| m | マージコミット表示トグル |
| q | パネルを閉じる（メイン履歴に戻る） |

## コマンド一覧

| コマンド | 説明 |
|---|---|
| `Git View: Show Commit History` | コミット履歴 Webview を開く |
| `Git View: Show File History` | アクティブエディタのファイル履歴を開く |

## 設計原則

- 表示特化（書き込み操作なし）
- 機能を足さない（トグル設定 / 設定項目を増やさない）
- VSCode 標準と重複しない（Source Control ビューに任せる）
- 外部ライブラリなし（git は child_process で直接実行）

## 開発

\`\`\`bash
npm run compile        # TypeScript コンパイル
npm run watch          # 監視モード
npx vsce package       # .vsix 作成
\`\`\`

仕様の正本は [SPEC.md](./SPEC.md)。
\`\`\`
```

### 注意
- README.md は日本語ベース（プロジェクト自体が日本語コメント・ドキュメント）
- 「個人利用 / Marketplace 公開しない」点は README にも明記
- 装飾的な絵文字バッジ等は付けない（シンプル原則）

## Out of Scope
- CLAUDE.md の更新（不要、引き続き Supervisor / Implementer 運用のまま）
- docs/workflow.md の更新（不要）
- ライセンス追加（個人利用前提）

## Editable Files
- SPEC.md
- README.md（新規）

## Do Not Edit
- src/ 配下の TypeScript ファイル（並列の uxJJ で触る）
- package.json
- CLAUDE.md
- docs/workflow.md

## Dependencies
- uxII マージ済み（main 最新）

## Branch
feature/uxKK-spec-readme-update

## Acceptance Criteria

### SPEC.md
- [ ] 変更行数（+N -N）列の記述が追加されている
- [ ] m / Enter / diff スクロールモード / q の記述が各キーボードショートカット表に追加されている
- [ ] 画面遷移図が現状を反映
- [ ] コマンド一覧に `simpleGitView.showFileHistory` が追加されている

### README.md
- [ ] プロジェクトルートに新規作成されている
- [ ] 特徴・インストール・キーボードショートカット・コマンド一覧・設計原則・開発手順がそれぞれ書かれている
- [ ] 各セクションが SPEC.md と矛盾しない

## Definition of Done
- [ ] コードが追加されている
- [ ] PR が作成されている（base: main）
