# WBS Template

ガントチャート付き WBS（Work Breakdown Structure）管理アプリのテンプレートです。

## 機能

- WBS テーブル（Phase / Category / Epic / Task / Milestone の階層管理）
- ガントチャート（計画・実績・遅延の可視化）
- リアルタイム同期（Supabase Realtime）
- パスワード認証
- フィルタリング（担当者 / ステータス / 遅延タスク）
- ドラッグ＆ドロップによる並び替え
- Undo / Redo（最大50回）
- JSON エクスポート / インポート
- タスクの昇格・降格（階層変更）

## 技術スタック

- React 19 + TypeScript
- Vite
- TailwindCSS v4
- Supabase（データベース + リアルタイム同期）

## セットアップ

### 1. Supabase プロジェクトの作成

[Supabase](https://supabase.com) でプロジェクトを作成し、以下の SQL を実行してください。

```sql
CREATE TABLE wbs_data (
  id TEXT PRIMARY KEY,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO wbs_data (id, tasks, updated_at) VALUES ('main', '[]'::jsonb, NOW());

ALTER PUBLICATION supabase_realtime ADD TABLE wbs_data;
ALTER TABLE wbs_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON wbs_data FOR ALL USING (true) WITH CHECK (true);
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env.local` を作成し、値を設定してください。

```bash
cp .env.example .env.local
```

| 変数名 | 説明 |
|:---|:---|
| `VITE_SUPABASE_URL` | Supabase プロジェクトの URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase の anon key |
| `VITE_APP_PASSWORD` | ログインパスワード |
| `VITE_APP_TITLE` | アプリのタイトル（デフォルト: `WBS`） |

### 3. インストールと起動

```bash
npm install
npm run dev
```

### 4. ビルド

```bash
npm run build
```

## CLI ツール

`cli/wbs-cli.mjs` を使って、コマンドラインから Supabase のタスクデータを直接更新できます。

```bash
node cli/wbs-cli.mjs
```

詳細は `node cli/wbs-cli.mjs --help` を参照してください。

## ドキュメント

- [操作マニュアル](docs/MANUAL.md)
