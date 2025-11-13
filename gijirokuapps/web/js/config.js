// AWS設定管理
class AWSConfig {
    constructor() {
        // AWS基本設定
        this.region = 'ap-northeast-1';
        
        // 環境判定（CloudFront URLで本番環境を判定）
        this._isDevelopment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1' ||
                             window.location.hostname.startsWith('192.168.') ||
                             window.location.hostname.startsWith('10.') ||
                             window.location.hostname.startsWith('172.');
        
        // 本番環境設定
        this.config = {
            userPoolId: 'ap-northeast-1_IZajChZJD',
            clientId: '7k7s2cko3vdf94lfghdac07dc0',
            identityPoolId: 'ap-northeast-1:865e8342-6bdc-4f1f-ba5b-0c07164b112e',
            bucketName: 'minutes-app-team-a-backet',
            dynamoTableName: 'minutes-app-team-a-dynamodb'
        };
    }
    
    // AWS SDK設定を初期化
    initializeAWS() {
        if (typeof AWS === 'undefined') {
            console.error('AWS SDK が読み込まれていません');
            return false;
        }
        
        AWS.config.update({
            region: this.region,
            credentials: null // Cognitoで後から設定
        });
        
        console.log('AWS SDK initialized');
        return true;
    }
    
    // 設定値を取得するヘルパーメソッド
    get userPoolId() {
        return this.config.userPoolId;
    }
    
    get clientId() {
        return this.config.clientId;
    }
    
    get identityPoolId() {
        return this.config.identityPoolId;
    }
    
    get bucketName() {
        return this.config.bucketName;
    }
    
    get dynamoTableName() {
        return this.config.dynamoTableName;
    }
    
    get isDevelopment() {
        return this._isDevelopment;
    }
    
    // 本番環境かどうかを判定
    isProduction() {
        return !this._isDevelopment;
    }
}

// グローバルインスタンス
window.awsConfig = new AWSConfig();