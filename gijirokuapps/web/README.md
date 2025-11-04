# 議事録感情分析アプリ - Web UI

## 概要
音声ファイル（MP3/MP4）から文字起こし、議事録要約、感情分析を行うWebアプリケーションのフロントエンド部分です。

## 機能
- **ファイルアップロード**: MP3/MP4ファイルのドラッグ&ドロップアップロード
- **処理状況確認**: アップロードしたファイルの処理状況をリアルタイム表示
- **結果表示**: 
  - 議事録要約（Bedrock Claude 3 Haiku生成）
  - 文字起こし結果（Amazon Transcribe）
  - 感情分析結果（Amazon Comprehend）
- **ダウンロード**: TXT、MD、議事録要約の各形式でダウンロード可能

## ローカル開発環境での実行方法

### 1. 必要な環境
- モダンなWebブラウザ（Chrome、Firefox、Safari、Edge）
- ローカルWebサーバー（推奨）

### 2. 実行手順

#### 方法1: Python簡易サーバー（推奨）
```bash
# webフォルダに移動
cd gijirokuapps/web

# Python 3の場合
python -m http.server 8000

# Python 2の場合
python -m SimpleHTTPServer 8000
```

#### 方法2: Node.js http-server
```bash
# http-serverをインストール（初回のみ）
npm install -g http-server

# webフォルダに移動
cd gijirokuapps/web

# サーバー起動
http-server -p 8000
```

#### 方法3: Live Server（VS Code拡張機能）
1. VS Codeで`index.html`を開く
2. 右クリック → "Open with Live Server"

### 3. アクセス方法
ブラウザで `http://localhost:8000` にアクセス

### 4. 開発モードの機能
- **簡易認証**: ユーザー名・パスワード入力（任意の値でOK）
- **模擬処理**: 実際のAWSサービスを使わずに動作確認可能
- **ローカルストレージ**: ブラウザのローカルストレージにデータ保存
- **模擬結果**: サンプルの文字起こし・要約・感情分析結果を表示

## ファイル構成
```
web/
├── index.html          # メインページ（アップロード・処理状況）
├── result.html         # 結果表示ページ
├── css/
│   └── style.css       # スタイルシート
├── js/
│   ├── auth.js         # 認証管理（開発用簡易認証）
│   ├── main.js         # メインロジック・ジョブ管理
│   ├── upload.js       # ファイルアップロード機能
│   └── result.js       # 結果表示・ダウンロード機能
└── README.md           # このファイル
```

## 開発モードの特徴

### 認証システム
- 開発モードでは簡易認証を使用
- 任意のユーザー名・パスワードでログイン可能
- 本番環境ではAWS Cognitoに切り替え

### データ保存
- ブラウザのローカルストレージを使用
- ページリロード後もデータが保持される
- ログアウト時に全データクリア

### 模擬処理フロー
1. ファイルアップロード（MP3/MP4検証のみ）
2. 処理状況表示（UPLOADED → PROCESSING → COMPLETED）
3. 模擬結果生成（サンプルデータ）
4. 結果表示・ダウンロード

## S3本番環境デプロイ手順

### 1. 事前準備
必要なAWSリソースが作成済みであることを確認してください：
- S3バケット（静的サイトホスティング設定済み）
- Cognito User Pool & Identity Pool
- DynamoDB テーブル（ProcessingJobs）
- Step Functions（処理ワークフロー）
- IAM ロール・ポリシー

### 2. 設定ファイル更新
`js/deploy.js` ファイルの `PRODUCTION_CONFIG` を実際の値に更新：

```javascript
const PRODUCTION_CONFIG = {
    userPoolId: 'ap-northeast-1_YOUR_USER_POOL_ID',
    clientId: 'YOUR_APP_CLIENT_ID',
    identityPoolId: 'ap-northeast-1:YOUR_IDENTITY_POOL_ID',
    bucketName: 'your-actual-bucket-name',
    dynamoTableName: 'ProcessingJobs'
};
```

### 3. S3バケットへのアップロード

#### 方法1: AWS CLI使用
```bash
# webフォルダに移動
cd gijirokuapps/web

# S3バケットに同期アップロード
aws s3 sync . s3://your-bucket-name/web/ --delete

# バケットポリシー確認
aws s3api get-bucket-policy --bucket your-bucket-name
```

#### 方法2: AWS Console使用
1. AWS S3コンソールにアクセス
2. 対象バケットを選択
3. webフォルダ内の全ファイルをアップロード
4. パブリック読み取り権限を設定

### 4. 静的サイトホスティング設定
```bash
# 静的サイトホスティング有効化
aws s3 website s3://your-bucket-name --index-document index.html --error-document index.html
```

### 5. CloudFront設定（推奨）
- ディストリビューション作成
- オリジンをS3バケットに設定
- キャッシュ動作の設定
- カスタムドメイン設定（オプション）

### 6. 動作確認
1. S3静的サイトURLまたはCloudFrontURLにアクセス
2. Cognito認証が正常に動作することを確認
3. ファイルアップロード機能をテスト
4. 処理完了後の結果表示を確認

### 7. セキュリティ設定
- HTTPS通信の強制
- CORS設定の確認
- バケットポリシーの最適化
- IAM権限の最小化

## 本番環境での機能

### 実装済み機能
- ✅ Cognito認証システム
- ✅ S3 Pre-signed URLアップロード
- ✅ DynamoDB ジョブ管理
- ✅ S3結果ファイル取得
- ✅ 環境自動判定（開発/本番）
- ✅ エラーハンドリング
- ✅ プログレス表示

### AWS連携機能
- **認証**: Cognito User Pool認証
- **ファイルアップロード**: S3 Pre-signed URL
- **ジョブ管理**: DynamoDB直接アクセス
- **結果取得**: S3ファイル取得
- **処理開始**: S3イベント → Step Functions

### 必要なAWSリソース
- S3バケット（静的サイトホスティング）
- Cognito（ユーザー認証）
- DynamoDB（ジョブ管理）
- Step Functions（処理ワークフロー）
- Transcribe（文字起こし）
- Bedrock（議事録要約）
- Comprehend（感情分析）

## トラブルシューティング

### よくある問題
1. **CORS エラー**: ローカルサーバーを使用してください
2. **ファイルが読み込まれない**: パスが正しいか確認
3. **認証プロンプトが表示されない**: ブラウザの設定を確認

### デバッグ方法
- ブラウザの開発者ツール（F12）でコンソールログを確認
- ローカルストレージの内容を確認（Application タブ）
- ネットワークタブでリクエストを確認

## 今後の拡張予定
- [ ] プログレスバー表示
- [ ] 自動更新機能
- [ ] ファイルプレビュー
- [ ] 感情分析結果のグラフ表示
- [ ] ダークモード対応
- [ ] 多言語対応

## 注意事項
- 開発モードでは実際のAI処理は行われません
- 本番環境では適切なセキュリティ設定が必要です
- ファイルサイズ制限（100MB）は実装済みです