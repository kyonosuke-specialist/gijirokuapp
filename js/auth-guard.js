// 認証ガード - ページアクセス制御
class AuthGuard {
    constructor() {
        this.checkAuthOnLoad();
    }
    
    // ページ読み込み時の認証チェック
    checkAuthOnLoad() {
        document.addEventListener('DOMContentLoaded', () => {
            if (!this.isAuthenticated()) {
                this.redirectToLogin();
            }
        });
    }
    
    // 認証状態確認
    isAuthenticated() {
        const token = localStorage.getItem('cognitoIdToken');
        if (!token) return false;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp > Date.now() / 1000;
        } catch {
            return false;
        }
    }
    
    // ログインページへリダイレクト
    redirectToLogin() {
        const loginUrl = `https://your-cognito-domain.auth.region.amazoncognito.com/login?client_id=your-client-id&response_type=code&scope=openid&redirect_uri=${encodeURIComponent(window.location.origin)}`;
        window.location.href = loginUrl;
    }
}

// 初期化
new AuthGuard();