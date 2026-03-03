# WBS Template

プロジェクトのタスクを **一覧表（WBSテーブル）** と **ガントチャート** で管理できる Web アプリです。
ブラウザさえあれば、インストール不要で誰でも使えます。

---

## このアプリでできること

| 機能 | 説明 |
|:---|:---|
| タスク管理 | フェーズ → カテゴリ → エピック → タスク の階層でタスクを整理できます |
| ガントチャート | タスクのスケジュールを視覚的に確認できます（計画・実績・遅延） |
| リアルタイム同期 | チームの誰かがタスクを更新すると、他の人の画面にも自動で反映されます |
| パスワード認証 | パスワードを知っているメンバーだけがアクセスできます |
| フィルター | 担当者・ステータス・遅延タスクで絞り込み表示ができます |
| 並び替え | ドラッグ＆ドロップでタスクの順番を変更できます |
| 元に戻す | 操作を間違えても Cmd+Z（Mac）/ Ctrl+Z（Windows）で戻せます（最大50回） |
| データの書き出し・読み込み | JSON ファイルでバックアップや復元ができます |

操作方法の詳細は [操作マニュアル](docs/MANUAL.md) をご覧ください。

---

## 初期セットアップ手順

このアプリを新しく立ち上げるには、以下の3つの準備が必要です。

### ステップ 1: データベース（Supabase）の準備

このアプリはデータの保存に **Supabase**（スーパーベース）というクラウドサービスを使います。

1. [https://supabase.com](https://supabase.com) にアクセスし、アカウントを作成します（無料プランでOK）
2. 「New project」からプロジェクトを作成します
   - **Name**: 任意の名前（例: `my-wbs`）
   - **Database Password**: 安全なパスワードを設定してください（後で使います）
   - **Region**: `Northeast Asia (Tokyo)` を選択
3. プロジェクトが作成されたら、左メニューの **「SQL Editor」** を開きます
4. 以下のコードをすべてコピーして貼り付け、**「Run」** ボタンを押してください

```sql
-- タスクデータを保存するテーブルを作成
CREATE TABLE wbs_data (
  id TEXT PRIMARY KEY,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 初期データ（空のタスクリスト）を挿入
INSERT INTO wbs_data (id, tasks, updated_at) VALUES ('main', '[]'::jsonb, NOW());

-- リアルタイム同期を有効化
ALTER PUBLICATION supabase_realtime ADD TABLE wbs_data;

-- セキュリティ設定
ALTER TABLE wbs_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON wbs_data FOR ALL USING (true) WITH CHECK (true);
```

5. 「Success」と表示されればOKです

### ステップ 2: 接続情報の設定

Supabase とアプリをつなぐための情報を設定します。

1. Supabase のダッシュボードで **「Settings」→「API」** を開きます
2. 以下の2つの値をメモしておきます
   - **Project URL**（`https://xxxxx.supabase.co` の形式）
   - **anon public** キー（`eyJ...` で始まる長い文字列）
3. プロジェクトフォルダ内の `.env.example` を `.env.local` という名前でコピーします

```bash
cp .env.example .env.local
```

4. `.env.local` をテキストエディタで開き、以下のように書き換えます

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co    ← ステップ2でメモしたProject URL
VITE_SUPABASE_ANON_KEY=eyJ...                   ← ステップ2でメモしたanon publicキー
VITE_APP_PASSWORD=チームで共有するパスワード       ← 任意のパスワードを設定
VITE_APP_TITLE=プロジェクト名 WBS                 ← 画面に表示されるタイトル（省略可、デフォルトは「WBS」）
```

### ステップ 3: アプリの起動

ターミナル（Mac）またはコマンドプロンプト（Windows）で以下を実行します。

```bash
# 1. プロジェクトフォルダに移動
cd wbs-template

# 2. 必要なライブラリをインストール（初回のみ）
npm install

# 3. アプリを起動
npm run dev
```

起動すると `http://localhost:5173` のような URL が表示されます。
ブラウザでこの URL を開くと、パスワード入力画面が表示されます。

> **補足**: `npm` コマンドを使うには Node.js が必要です。
> まだインストールしていない場合は [https://nodejs.org](https://nodejs.org) からダウンロードしてください（LTS版を推奨）。

---

## 本番環境へのデプロイ

チーム全員がアクセスできるようにするには、Vercel などのホスティングサービスにデプロイします。
デプロイの手順は管理者にお問い合わせください。

### ビルドコマンド

```bash
npm run build
```

---

## CLI ツール（上級者向け）

コマンドラインから直接タスクデータを更新できるツールも付属しています。

```bash
node cli/wbs-cli.mjs --help
```

---

## ドキュメント

- [操作マニュアル](docs/MANUAL.md) — アプリの使い方を詳しく説明しています
