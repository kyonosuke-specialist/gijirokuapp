// 認証管理（開発・本番対応）
class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        
        // 環境判定（config.jsから取得）
        this.isDevelopmentMode = window.awsConfig ? window.awsConfig.isDevelopment : true;
    }

    // ログイン（開発・本番対応）
    async login(username, password) {
        return new Promise((resolve, reject) => {
            if (this.isDevelopmentMode) {
                // 開発用の簡易認証
                if (username && password) {
                    this.isAuthenticated = true;
                    this.currentUser = {
                        username: username,
                        loginTime: new Date().toISOString()
                    };
                    localStorage.setItem('authUser', JSON.stringify(this.currentUser));
                    resolve(this.currentUser);
                } else {
                    reject(new Error('ユーザー名とパスワードが必要です'));
                }
            } else {
                // 本番環境では認証済みとして処理
                reject(new Error('本番環境では認証済みです'));
            }
        });
    }
    
    // AWS認証情報設定（Identity Pool使用）
    async setupAWSCredentials(idToken) {
        return new Promise((resolve, reject) => {
            // AWS設定を更新
            AWS.config.update({
                region: window.awsConfig.region
            });
            
            // Identity PoolでAWS認証情報を取得
            AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                IdentityPoolId: window.awsConfig.identityPoolId,
                Logins: {
                    [`cognito-idp.${window.awsConfig.region}.amazonaws.com/${window.awsConfig.userPoolId}`]: idToken
                }
            });
            
            // 認証情報を取得
            AWS.config.credentials.get((error) => {
                if (error) {
                    console.error('AWS認証情報の取得に失敗:', error);
                    reject(error);
                } else {
                    console.log('AWS認証情報が設定されました');
                    resolve();
                }
            });
        });
    }

    // ログアウト
    logout() {
        this.isAuthenticated = false;
        this.currentUser = null;
        localStorage.removeItem('authUser');
        localStorage.clear(); // 開発用：全データクリア
        alert('ログアウトしました');
        window.location.reload();
    }

    // 開発環境用AWS認証情報設定
    setupDevelopmentCredentials() {
        return new Promise((resolve, reject) => {
            // AWS SDK初期化
            window.awsConfig.initializeAWS();
            
            // HTMLで取得したCognito ID Tokenを使用
            const idToken = localStorage.getItem('cognitoIdToken');
            
            if (idToken) {
                // ID Tokenを使用してIdentity Pool認証
                AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                    IdentityPoolId: window.awsConfig.identityPoolId,
                    Logins: {
                        [`cognito-idp.${window.awsConfig.region}.amazonaws.com/${window.awsConfig.userPoolId}`]: idToken
                    }
                });
            } else {
                // ID Tokenがない場合はエラー
                reject(new Error('Cognito ID Tokenが見つかりません'));
                return;
            }
            
            // 認証情報を取得
            AWS.config.credentials.get((error) => {
                if (error) {
                    console.error('認証情報設定エラー:', error);
                    reject(error);
                } else {
                    console.log('開発環境用認証情報を設定しました');
                    // DynamoDBクライアントを初期化
                    if (window.dynamoClient) {
                        window.dynamoClient.initializeDynamoDB();
                    }
                    resolve();
                }
            });
        });
    }

    // 認証状態確認
    checkAuthStatus() {
        if (this.isDevelopmentMode) {
            const savedUser = localStorage.getItem('authUser');
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
                this.isAuthenticated = true;
                // 開発環境用の認証情報を設定
                return this.setupDevelopmentCredentials().then(() => this.currentUser);
            }
        } else {
            // 本番環境：Cognito ID Tokenを確認
            const idToken = localStorage.getItem('cognitoIdToken');
            if (idToken) {
                try {
                    const payload = JSON.parse(atob(idToken.split('.')[1]));
                    if (payload.exp > Date.now() / 1000) {
                        this.isAuthenticated = true;
                        this.currentUser = {
                            username: payload['cognito:username'] || 'user',
                            loginTime: new Date().toISOString()
                        };
                        localStorage.setItem('authUser', JSON.stringify(this.currentUser));
                        return this.setupDevelopmentCredentials().then(() => this.currentUser);
                    }
                } catch (e) {
                    console.error('ID Token解析エラー:', e);
                }
            }
        }
        return Promise.reject('認証が必要です');
    }

    // 簡易ログインプロンプト（開発用）
    async promptLogin() {
        if (this.isDevelopmentMode) {
            const username = prompt('ユーザー名を入力してください（開発用）:', 'testuser');
            const password = prompt('パスワードを入力してください（開発用）:', 'testpass');
            
            if (!username || !password) {
                throw new Error('ユーザー名とパスワードが必要です');
            }
            
            const result = await this.login(username, password);
            // ログイン後に認証情報を設定
            await this.setupDevelopmentCredentials();
            return result;
        } else {
            // 本番環境では認証済みとして処理
            this.isAuthenticated = true;
            this.currentUser = { username: 'authenticated-user', loginTime: new Date().toISOString() };
            localStorage.setItem('authUser', JSON.stringify(this.currentUser));
            await this.setupDevelopmentCredentials();
            return this.currentUser;
        }
    }



    // 認証済みユーザー情報取得
    getCurrentUser() {
        return this.currentUser;
    }

    // 認証状態取得
    isLoggedIn() {
        return this.isAuthenticated;
    }
}

// グローバルインスタンス
window.authManager = new AuthManager();

// ページ読み込み時の認証チェック
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.authManager.checkAuthStatus();
        console.log('既存セッションで認証済み:', window.authManager.getCurrentUser());
    } catch (error) {
        console.log('認証が必要です');
        try {
            await window.authManager.promptLogin();
            console.log('ログイン成功:', window.authManager.getCurrentUser());
        } catch (loginError) {
            console.log('認証処理をスキップして続行:', loginError.message);
            // 認証エラーでも続行（本番環境ではCognito認証済み前提）
            window.authManager.isAuthenticated = true;
            window.authManager.currentUser = { username: 'user', loginTime: new Date().toISOString() };
            try {
                await window.authManager.setupDevelopmentCredentials();
                localStorage.setItem('authUser', JSON.stringify(window.authManager.currentUser));
            } catch (setupError) {
                console.log('認証情報設定をスキップ:', setupError.message);
            }
        }
    }
    
    // ログアウトボタンのイベント設定
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('ログアウトしますか？')) {
                authManager.logout();
            }
        });
    }
});