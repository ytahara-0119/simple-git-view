# issue01

## Issue ID
issue01

## Title
環境構築（package.json / tsconfig.json / ディレクトリ構成）

## Purpose
VSCode 拡張機能のビルド・実行に必要な最小構成を整備する。

## Background
TypeScript で VSCode Extension を開発するには package.json のマニフェスト設定と tsconfig.json のコンパイル設定が必要。
src/ ディレクトリも初期状態で揃えておく。

## Scope
- package.json を作成する（拡張機能マニフェスト・依存関係・scripts）
- tsconfig.json を作成する
- src/ ディレクトリと空の各 .ts ファイルを作成する
  - src/extension.ts（エントリポイントのスタブ）
  - src/gitService.ts（スタブ）
  - src/sidebarProvider.ts（スタブ）
  - src/historyPanel.ts（スタブ）
  - src/blameDecoration.ts（スタブ）
- `npm install` でビルド環境が整う状態にする

## Out of Scope
- 各モジュールの実装ロジック
- コマンド登録・プロバイダ初期化

## Editable Files
- package.json
- tsconfig.json
- src/extension.ts
- src/gitService.ts
- src/sidebarProvider.ts
- src/historyPanel.ts
- src/blameDecoration.ts

## Do Not Edit
（なし）

## Dependencies
（なし）

## Branch
feature/issue01-env-setup

## Implementation Notes
- `activationEvents`: `["workspaceContains:.git"]`
- `engines.vscode`: `"^1.85.0"`
- `main`: `"./out/extension"`
- devDependencies に `@types/vscode`, `typescript` を含める
- scripts に `vscode:prepublish`, `compile`, `watch` を含める
- tsconfig は `"module": "commonjs"`, `"target": "ES2020"`, `"outDir": "./out"`, `"strict": true`
- src/*.ts のスタブは export だけ書いておけば良い（中身は後続 issue で実装）
- .vscodeignore は後続 issue07 で作成するため本 issue では不要

## Acceptance Criteria
- [ ] package.json が存在し `npm install` が成功する
- [ ] tsconfig.json が存在し `npx tsc --noEmit` がエラーなしで通る
- [ ] src/ 配下に 5 ファイルのスタブが存在する
- [ ] `npm run compile` で out/ に JS が生成される

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md と矛盾しない
- [ ] 実装内容を説明できる
