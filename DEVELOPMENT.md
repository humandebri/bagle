# 開発環境でのエラー解決方法

## `useSession` must be wrapped in a <SessionProvider /> エラーについて

このエラーはローカル環境でTurbopackを使用している場合に発生します。

### 解決方法

開発サーバーを起動する際は、Turbopackを使わずに起動してください：

```bash
# ❌ Turbopackを使う（エラーが発生する）
pnpm dev:turbo

# ✅ Turbopackを使わない（推奨）
pnpm dev
```

### 背景

- このプロジェクトはReact 19を使用しています
- NextAuth v4とReact 19の互換性問題を回避するため、意図的にSessionProviderを使用していません
- Turbopackは実験的な機能であり、一部のライブラリとの互換性問題があります

### Vercelでエラーが出ない理由

Vercelのビルドプロセスでは通常のNext.jsビルドが使用され、Turbopackは使用されないため、このエラーは発生しません。