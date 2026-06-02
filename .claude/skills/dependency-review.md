# Dependency Review Skill

依存ライブラリの健全性を確認するスキル。

## 実行手順

1. `npm audit` で CVE を確認する
2. `npm outdated` でバージョン状況を確認する
3. `package.json` の直接依存を `npm info` で調査する

## チェック項目

- Critical / High CVE の有無
- メンテナが活発か（アーカイブ済みでないか）
- 最終リリースが極端に古くないか（1年以上更新なし = 要注意）
- Star数・Issue数（目安として参照）

## 対応パッケージマネージャー

npm / pnpm / yarn / pip / cargo / go

## 結果分類

| 判定 | 基準 |
|------|------|
| 問題なし | CVEなし・活発にメンテナンス中 |
| 要注意 | Moderate CVEあり、または更新が止まっている |
| 置換推奨 | High/Critical CVEあり、またはアーカイブ済み |
