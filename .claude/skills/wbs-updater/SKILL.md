---
name: wbs-updater
description: "WBSアプリのタスクデータをSupabaseに直接更新するスキル。議事録やミーティングメモの内容に基づいて、タスクのステータス・進捗・日付等をCLIツール経由で更新する。UI操作不要。トリガー: 「WBS更新」「WBSを更新して」「タスク進捗を反映して」「議事録からWBSを更新」「WBS status update」など。"
---

# WBS Updater

議事録・ミーティングメモ等のソースからWBSタスクの変更を特定し、Supabaseに直接反映する。

## 前提

- CLIツール: `node cli/wbs-cli.mjs`（プロジェクトルートから実行）
- `.env.local` に Supabase の接続情報が設定済みであること
- Supabase に直接書き込み。アプリの Realtime 機能により UI に即座に反映される

## CLI コマンドリファレンス

```bash
# タスク一覧（サマリ表示）
node cli/wbs-cli.mjs list --summary

# 特定タスク取得
node cli/wbs-cli.mjs get <task-id>

# キーワード検索
node cli/wbs-cli.mjs search <keyword>

# 単一タスク更新
node cli/wbs-cli.mjs update <task-id> --field value

# 差分プレビュー（ドライラン）
node cli/wbs-cli.mjs diff --file /tmp/wbs-changes.json

# 一括更新
node cli/wbs-cli.mjs batch-update --file /tmp/wbs-changes.json
```

## タスクデータモデル

| フィールド | 型 | 値の例 |
|-----------|-----|-------|
| id | string | 'A1.3', 'M1' |
| group | string | Phase, Category, Epic, Task, Milestone |
| title | string | タスク名 |
| status | string | 未着手, 対応中, 確認中, 完了, 保留 |
| progress | number | 0-100 |
| priority | string | 高, 中, 低 |
| owner | string | カンマ区切り（例: '田中, 鈴木'） |
| planStart / planEnd | string | YYYY-MM-DD |
| actualStart / actualEnd | string | YYYY-MM-DD |
| notes | string | 自由記述 |
| link | string | URL等 |
| source | string | 参照元情報 |

## ワークフロー

### 1. WBS現状を把握する

```bash
node cli/wbs-cli.mjs list --summary
```

全タスクのID・タイトル・ステータス・進捗を確認する。

### 2. ソースを読み込む

ユーザーが指定した情報源を読む:
- 議事録ファイル
- ミーティングメモ
- ユーザーの口頭指示

### 3. 変更内容を特定する

ソースの内容とWBS現状を比較し、以下の変更を特定する:

- **ステータス変更**: 「完了した」「着手した」等 → status更新
- **進捗変更**: 「70%完了」「ほぼ完了」等 → progress更新
- **日付変更**: 「開始した」→ actualStart設定、「完了した」→ actualEnd設定
- **担当者変更**: 「〇〇が引き継ぐ」等 → owner更新
- **備考追加**: MTGでの決定事項等 → notes更新

### 4. 変更JSONを生成しプレビューする

`/tmp/wbs-changes.json` を生成する:

```json
{
  "changes": [
    {
      "taskId": "A1.3",
      "updates": {
        "status": "完了",
        "progress": 100,
        "actualEnd": "2026-03-03",
        "notes": "MTGで完了報告"
      }
    }
  ]
}
```

ドライランで差分を表示:

```bash
node cli/wbs-cli.mjs diff --file /tmp/wbs-changes.json
```

### 5. ユーザーに確認する（必須）

**必ずAskUserQuestionで承認を得ること。** 差分内容を表示し、以下を確認:
- 変更内容が正しいか
- 追加・修正したい項目がないか

### 6. 変更を適用する

承認後に実行:

```bash
node cli/wbs-cli.mjs batch-update --file /tmp/wbs-changes.json
```

### 7. 結果レポート

- 更新されたタスクのサマリを出力
- ソースに記載されていたがWBSにマッピングできなかった項目があれば報告
- 一時ファイルを削除: `rm /tmp/wbs-changes.json`

## マッピングルール

### ステータス推定

| ソースの表現 | WBSステータス |
|-------------|-------------|
| 完了、終わった、done | 完了 |
| 着手、開始、始めた | 対応中 |
| レビュー中、確認待ち | 確認中 |
| 保留、ペンディング、一旦止め | 保留 |
| まだ、未着手 | 未着手 |

### 進捗推定

- 「完了」→ 100
- 「ほぼ完了」「9割」→ 90
- 「半分くらい」→ 50
- 「着手したばかり」→ 10-20
- 具体的な数値が言及されていればそのまま使用

### 日付設定

- ステータスが「対応中」に変わった場合 → actualStartに今日の日付を設定（空の場合のみ）
- ステータスが「完了」に変わった場合 → actualEndに今日の日付を設定

## 注意事項

- 推測で更新しない。ソースに明確な根拠がある変更のみ反映する
- 判断に迷う場合はユーザーに確認する
- 一時ファイルは `/tmp/` に保存する
