# TopPerformer - AI Sales Manager

営業組織専用マネジメントAI「報告を、戦略に変える」

## 🚀 デプロイ手順（Cloudflare Pages）

### Step 1: このリポジトリをGitHubにアップロード

1. GitHubにログイン
2. 右上の「+」→「New repository」をクリック
3. Repository name: `topperformer`
4. 「Create repository」をクリック
5. 表示されるコマンドに従ってアップロード

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/topperformer.git
git push -u origin main
```

### Step 2: Cloudflareアカウント作成

1. https://dash.cloudflare.com/sign-up にアクセス
2. メールアドレスとパスワードで登録（カード不要）
3. メール認証を完了

### Step 3: Cloudflare Pagesでデプロイ

1. Cloudflareダッシュボードにログイン
2. 左メニュー「Workers & Pages」をクリック
3. 「Create」→「Pages」→「Connect to Git」
4. GitHubアカウントを連携
5. `topperformer` リポジトリを選択
6. ビルド設定:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
7. 「Save and Deploy」をクリック

### Step 4: Gemini APIキーを取得

1. https://aistudio.google.com/app/apikey にアクセス
2. Googleアカウントでログイン
3. 「Create API Key」をクリック
4. APIキーをコピー
5. デプロイしたアプリで「日報を提出」をクリック
6. APIキーを入力して保存

## 📱 機能

### 営業担当者向け
- 📊 進捗ダッシュボード（日次/週次/月次）
- 📝 多角的なレポート投稿（朝礼、夕礼、週報、月報、ヨミ表、予算設定）
- 🤖 AIマネージャーからのフィードバック
- 📤 レポート共有機能

### 管理者向け（パスワード: admin または 1234）
- 👥 チーム・ヘルスチェック
- 📈 AIボトルネック分析

## 🔧 ローカル開発

```bash
npm install
npm run dev
```

## 📄 ライセンス

MIT
