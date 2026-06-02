現在のブランチの変更をセキュリティレビューしてください。

以下の手順で進めてください:

1. `git remote set-head origin main 2>/dev/null || true` を実行して origin/HEAD を設定する
2. `git log origin/main...HEAD --oneline` でブランチ上のコミットを確認する
3. `git diff origin/main...HEAD` で変更 diff を取得する（コミットがない場合は `git diff HEAD` を使う）
4. `npm audit` を実行する

以下の観点でレポートしてください:
- ハードコードされた秘密情報・APIキー・Token
- XSS（innerHTML への無エスケープ挿入など）
- Path Traversal
- Command Injection（shell=True / execSync など）
- SQL Injection
- SSRF

問題がない場合もその旨を明記してください。
