<!-- STATIC one-time copy from /Users/ogikazuki/Development/wbs-template/.claude/CLAUDE.md for Codex. No automatic sync. -->

# WBS Template

ガントチャート付き WBS 管理アプリ（React 19 + TypeScript + Vite + TailwindCSS v4 + Supabase）。

## プロジェクト構成

- `src/` - アプリケーションソースコード
- `cli/wbs-cli.mjs` - Supabase を直接操作する CLI ツール
- `docs/MANUAL.md` - ユーザー向け操作マニュアル

## 開発コマンド

- `npm run dev` - 開発サーバー起動
- `npm run build` - TypeScript チェック + Vite ビルド
- `npm run lint` - ESLint 実行

## CLI ツール

```bash
node cli/wbs-cli.mjs list --summary    # タスク一覧
node cli/wbs-cli.mjs get <id>          # タスク取得
node cli/wbs-cli.mjs search <keyword>  # 検索
node cli/wbs-cli.mjs update <id> --status 完了  # 単一更新
node cli/wbs-cli.mjs batch-update --file /tmp/wbs-changes.json  # 一括更新
```

## 環境変数（.env.local）

- `VITE_SUPABASE_URL` - Supabase プロジェクト URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key
- `VITE_APP_PASSWORD` - ログインパスワード
- `VITE_APP_TITLE` - アプリタイトル（デフォルト: WBS）
