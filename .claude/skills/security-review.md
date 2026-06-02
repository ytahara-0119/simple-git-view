# Security Review Skill

実装後のセキュリティレビュー。

## diff の取得方法

origin/HEAD が未設定の場合があるため、以下の順序で取得する:

1. `git remote set-head origin main 2>/dev/null || true` を実行する
2. `git log origin/main...HEAD --oneline` でコミットを確認する
3. `git diff origin/main...HEAD` で diff を取得する
4. コミットがない場合は `git diff HEAD`（unstaged 含む）を使う

## チェック項目

- ハードコードされた秘密情報・APIキー・Token
- SQL Injection
- XSS（innerHTML / dangerouslySetInnerHTML への無エスケープ挿入）
- Path Traversal（ファイルパスの検証なし）
- SSRF（外部リクエストのホスト制御）
- Command Injection（shell経由の外部コマンド実行）

## 利用可能なら実行

- `npm audit`
- `cargo audit`
- `pip-audit`

## 結果

問題点を重大度（High / Medium / Low）付きでレポートする。
問題がない場合もその旨を明記する。
