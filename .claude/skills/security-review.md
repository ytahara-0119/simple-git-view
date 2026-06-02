# Security Review

実装後レビュー

確認:

- ハードコードされた秘密情報
- APIキー
- Token
- SQL Injection
- XSS
- Path Traversal
- SSRF
- Command Injection

利用可能なら実行:

npm audit
cargo audit
pip-audit
gitleaks
semgrep

結果をレポートする