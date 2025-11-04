// S3デプロイ用設定スクリプト
// 本番環境にデプロイする前に実行してください

// 実際のAWS設定値を入力してください
const PRODUCTION_CONFIG = {
    userPoolId: 'ap-northeast-1_IZajChZJD',        // Cognito User Pool ID
    clientId: '7k7s2cko3vdf94lfghdac07dc0',        // Cognito App Client ID
    bucketName: 'minutes-app-team-a-web-backet', // S3 Bucket Name (スペース削除)
    dynamoTableName: 'minutes-app-team-a-dynamodb'               // DynamoDB Table Name (仕様書通り)
};

// 設定を更新する関数
function updateProductionConfig() {
    if (typeof window !== 'undefined' && window.updateAWSConfig) {
        window.updateAWSConfig(PRODUCTION_CONFIG);
        console.log('本番環境設定が更新されました');
    } else {
        console.error('設定更新関数が見つかりません');
    }
}

// ページ読み込み時に自動実行（本番環境のみ）
document.addEventListener('DOMContentLoaded', () => {
    if (window.awsConfig && !window.awsConfig.isDevelopment) {
        updateProductionConfig();
    }
});

// 手動実行用
window.deployConfig = {
    update: updateProductionConfig,
    config: PRODUCTION_CONFIG
};