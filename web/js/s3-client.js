// S3ファイル操作クライアント
class S3Client {
    constructor() {
        this.s3 = null;
    }
    
    // S3クライアント初期化
    initializeS3() {
        if (typeof AWS === 'undefined') {
            console.error('AWS SDK が読み込まれていません');
            return false;
        }
        
        if (!window.awsConfig) {
            console.error('AWS Config が初期化されていません');
            return false;
        }
        
        this.s3 = new AWS.S3({
            region: window.awsConfig.region,
            signatureVersion: 'v4'
        });
        
        console.log('S3 Client initialized');
        return true;
    }
    
    // S3直接アップロード
    async uploadFileDirectly(file, onProgress = null) {
        return new Promise((resolve, reject) => {
            // 認証情報確認
            if (!AWS.config.credentials) {
                reject(new Error('AWS認証情報が設定されていません'));
                return;
            }
            
            console.log('AWS認証情報タイプ:', typeof AWS.config.credentials);
            console.log('AWS認証情報:', AWS.config.credentials);
            
            // 認証情報を更新
            AWS.config.credentials.get((credError) => {
                if (credError) {
                    console.error('認証情報エラー:', credError);
                    reject(new Error(`認証情報の取得に失敗: ${credError.message}`));
                    return;
                }
                
                // S3クライアントを初期化
                if (!this.s3) {
                    this.initializeS3();
                }
                
                if (!this.s3) {
                    reject(new Error('S3クライアントの初期化に失敗しました'));
                    return;
                }
                
                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
                const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${nameWithoutExt}`;
                const s3Key = `input-data/${jobId}`;
                
                const params = {
                    Bucket: window.awsConfig.bucketName,
                    Key: s3Key,
                    Body: file,
                    ContentType: file.type
                };
                
                console.log('S3アップロード開始:', {
                    bucket: params.Bucket,
                    key: params.Key,
                    fileSize: file.size
                });
                
                const upload = this.s3.upload(params);
                
                // プログレス監視
                if (onProgress && typeof onProgress === 'function') {
                    upload.on('httpUploadProgress', (progress) => {
                        const percentComplete = (progress.loaded / progress.total) * 100;
                        console.log(`アップロード進行状況: ${Math.round(percentComplete)}%`);
                        onProgress(percentComplete, progress.loaded, progress.total);
                    });
                }
                
                upload.send((err, data) => {
                    if (err) {
                        console.error('S3アップロードエラー:', err);
                        reject(new Error(`アップロードに失敗しました: ${err.message}`));
                    } else {
                        console.log('S3アップロード成功:', data);
                        resolve({
                            s3Key: s3Key,
                            jobId: jobId,
                            location: data.Location,
                            etag: data.ETag
                        });
                    }
                });
            });
        });
    }
    
    // ダウンロード用Pre-signed URL取得
    async getPresignedDownloadUrl(s3Key) {
        return new Promise((resolve, reject) => {
            if (!this.s3) {
                this.initializeS3();
            }
            
            if (!this.s3) {
                reject(new Error('S3クライアントが初期化されていません'));
                return;
            }
            
            const params = {
                Bucket: window.awsConfig.bucketName,
                Key: s3Key,
                Expires: 300
            };
            
            this.s3.getSignedUrl('getObject', params, (err, url) => {
                if (err) {
                    console.error('ダウンロードURL取得エラー:', err);
                    reject(new Error(`ダウンロードURL取得に失敗しました: ${err.message}`));
                } else {
                    resolve(url);
                }
            });
        });
    }
    

    
    // S3からファイル内容を取得
    async getFileContent(s3Key) {
        return new Promise((resolve, reject) => {
            if (!this.s3) {
                this.initializeS3();
            }
            
            if (!this.s3) {
                reject(new Error('S3クライアントが初期化されていません'));
                return;
            }
            
            const params = {
                Bucket: window.awsConfig.bucketName,
                Key: s3Key
            };
            
            console.log('S3ファイル取得試行:', params);
            
            this.s3.getObject(params, (err, data) => {
                if (err) {
                    console.error('S3ファイル取得エラー:', {
                        error: err,
                        bucket: params.Bucket,
                        key: params.Key,
                        code: err.code,
                        message: err.message
                    });
                    reject(new Error(`ファイル取得に失敗しました: ${err.message}`));
                } else {
                    console.log('S3ファイル取得成功:', s3Key);
                    resolve(data.Body);
                }
            });
        });
    }
}

// グローバルインスタンス
window.s3Client = new S3Client();