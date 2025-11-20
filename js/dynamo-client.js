// DynamoDB操作クライアント
class DynamoClient {
    constructor() {
        this.dynamodb = null;
        this.isDevelopmentMode = window.awsConfig ? window.awsConfig.isDevelopment : true;
        
        // 認証完了後に初期化
    }
    
    // DynamoDBクライアント初期化
    initializeDynamoDB() {
        if (typeof AWS === 'undefined') {
            console.error('AWS SDK が読み込まれていません');
            return false;
        }
        
        console.log('DynamoDB初期化開始');
        console.log('AWS認証情報:', {
            exists: !!AWS.config.credentials,
            type: typeof AWS.config.credentials,
            region: window.awsConfig?.region
        });
        
        // 認証情報がない場合でも初期化を試行
        try {
            this.dynamodb = new AWS.DynamoDB.DocumentClient({
                region: window.awsConfig.region
            });
            
            console.log('DynamoDB Client initialized successfully');
            return true;
        } catch (error) {
            console.error('DynamoDB Client初期化エラー:', error);
            return false;
        }
    }
    
    // ジョブレコード作成
    async createJob(jobData) {
        // 本番環境でDynamoDBにジョブを作成
        
        return new Promise((resolve, reject) => {
            if (!this.dynamodb && AWS.config.credentials) {
                this.initializeDynamoDB();
            }
            if (!this.dynamodb) {
                reject(new Error('DynamoDBクライアントが初期化されていません'));
                return;
            }
            
            // 現在のユーザーIDを取得
            const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
            const userId = currentUser ? currentUser.username : 'anonymous';
            
            const params = {
                TableName: window.awsConfig.dynamoTableName,
                Item: {
                    job_id: jobData.job_id,
                    user_id: userId,
                    file_name: jobData.file_name,
                    file_size: jobData.file_size,
                    file_type: jobData.file_type,
                    status: jobData.status || 'UPLOADED',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    s3_upload_key: jobData.s3_upload_key,
                    transcript_s3_key: null,
                    summary_s3_key: null,
                    sentiment_s3_key: null,
                    error_message: null
                }
            };
            
            this.dynamodb.put(params, (err, data) => {
                if (err) {
                    console.error('DynamoDB putItem エラー:', err);
                    reject(new Error(`ジョブ作成に失敗しました: ${err.message}`));
                } else {
                    console.log('ジョブレコードが作成されました:', jobData.job_id);
                    resolve(data);
                }
            });
        });
    }
    
    // ジョブ情報取得
    async getJob(jobId) {
        // DynamoDBからジョブ情報を取得
        
        return new Promise((resolve, reject) => {
            if (!this.dynamodb) {
                reject(new Error('DynamoDBクライアントが初期化されていません'));
                return;
            }
            
            const params = {
                TableName: window.awsConfig.dynamoTableName,
                Key: {
                    job_id: jobId
                }
            };
            
            this.dynamodb.get(params, (err, data) => {
                if (err) {
                    console.error('DynamoDB getItem エラー:', err);
                    reject(new Error(`ジョブ取得に失敗しました: ${err.message}`));
                } else {
                    resolve(data.Item || null);
                }
            });
        });
    }
    
    // ユーザーのジョブ一覧取得
    async listJobs(userId = null) {
        return new Promise((resolve, reject) => {
            console.log('listJobs開始');
            
            if (!this.dynamodb) {
                console.error('DynamoDBクライアントが初期化されていません');
                reject(new Error('DynamoDBクライアントが初期化されていません'));
                return;
            }
            
            // 現在のユーザーIDを取得
            const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
            const targetUserId = userId || (currentUser ? currentUser.username : 'anonymous');
            
            console.log('ターゲットユーザーID:', targetUserId);
            
            // GSIがないためscanを直接使用
            this.scanJobsByUser(targetUserId)
                .then(jobs => {
                    console.log('listJobs成功:', jobs.length, '件');
                    resolve(jobs);
                })
                .catch(error => {
                    console.error('listJobsエラー:', error);
                    reject(error);
                });
        });
    }
    
    // ユーザーのジョブをscanで取得（GSI代替）
    async scanJobsByUser(userId) {
        return new Promise((resolve, reject) => {
            const params = {
                TableName: window.awsConfig.dynamoTableName,
                FilterExpression: 'user_id = :userId',
                ExpressionAttributeValues: {
                    ':userId': userId
                },
                Limit: 50
            };
            
            console.log('DynamoDB scanパラメータ:', params);
            
            this.dynamodb.scan(params, (err, data) => {
                if (err) {
                    console.error('DynamoDB scan エラー:', err);
                    reject(new Error(`ジョブ一覧取得に失敗しました: ${err.message}`));
                } else {
                    console.log('DynamoDB scan結果:', data);
                    
                    // DynamoDBのAttributeValue形式を通常のオブジェクトに変換
                    const items = (data.Items || []).map(item => {
                        console.log('変換前のアイテム:', item);
                        const convertedItem = {
                            job_id: item.job_id?.S || item.job_id,
                            file_name: item.file_name?.S || item.file_name,
                            status: item.status?.S || item.status || 'UPLOADED',
                            created_at: item.created_at?.S || item.created_at,
                            updated_at: item.updated_at?.S || item.updated_at,
                            user_id: item.user_id?.S || item.user_id,
                            transcript_s3_key: item.transcript_s3_key?.S || item.transcript_s3_key,
                            summary_s3_key: item.summary_s3_key?.S || item.summary_s3_key,
                            sentiment_s3_key: item.sentiment_s3_key?.S || item.sentiment_s3_key
                        };
                        console.log('変換後のアイテム:', convertedItem);
                        return convertedItem;
                    });
                    
                    // 作成日時で降順ソート
                    const sortedItems = items.sort((a, b) => 
                        new Date(b.created_at || 0) - new Date(a.created_at || 0)
                    );
                    
                    console.log('最終的なジョブ一覧:', sortedItems);
                    resolve(sortedItems);
                }
            });
        });
    }
    
    // ジョブ状況更新
    async updateJobStatus(jobId, status, additionalData = {}) {
        if (this.isDevelopmentMode) {
            // 開発環境ではローカルストレージを更新
            const jobs = JSON.parse(localStorage.getItem('processingJobs') || '[]');
            const jobIndex = jobs.findIndex(j => j.job_id === jobId);
            if (jobIndex !== -1) {
                jobs[jobIndex].status = status;
                jobs[jobIndex].updated_at = new Date().toISOString();
                Object.assign(jobs[jobIndex], additionalData);
                localStorage.setItem('processingJobs', JSON.stringify(jobs));
            }
            return Promise.resolve({ success: true });
        }
        
        return new Promise((resolve, reject) => {
            if (!this.dynamodb) {
                reject(new Error('DynamoDBクライアントが初期化されていません'));
                return;
            }
            
            // 更新式を動的に構築
            let updateExpression = 'SET #status = :status, updated_at = :updatedAt';
            const expressionAttributeNames = {
                '#status': 'status'
            };
            const expressionAttributeValues = {
                ':status': status,
                ':updatedAt': new Date().toISOString()
            };
            
            // 追加データがある場合は更新式に追加
            Object.keys(additionalData).forEach((key, index) => {
                const attrName = `#attr${index}`;
                const attrValue = `:val${index}`;
                updateExpression += `, ${attrName} = ${attrValue}`;
                expressionAttributeNames[attrName] = key;
                expressionAttributeValues[attrValue] = additionalData[key];
            });
            
            const params = {
                TableName: window.awsConfig.dynamoTableName,
                Key: {
                    job_id: jobId
                },
                UpdateExpression: updateExpression,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                ReturnValues: 'UPDATED_NEW'
            };
            
            this.dynamodb.update(params, (err, data) => {
                if (err) {
                    console.error('DynamoDB update エラー:', err);
                    reject(new Error(`ジョブ更新に失敗しました: ${err.message}`));
                } else {
                    console.log('ジョブが更新されました:', jobId, status);
                    resolve(data);
                }
            });
        });
    }
    
    // ジョブ削除
    async deleteJob(jobId) {
        if (this.isDevelopmentMode) {
            // 開発環境ではローカルストレージから削除
            const jobs = JSON.parse(localStorage.getItem('processingJobs') || '[]');
            const filteredJobs = jobs.filter(j => j.job_id !== jobId);
            localStorage.setItem('processingJobs', JSON.stringify(filteredJobs));
            return Promise.resolve({ success: true });
        }
        
        return new Promise((resolve, reject) => {
            if (!this.dynamodb) {
                reject(new Error('DynamoDBクライアントが初期化されていません'));
                return;
            }
            
            const params = {
                TableName: window.awsConfig.dynamoTableName,
                Key: {
                    job_id: jobId
                }
            };
            
            this.dynamodb.delete(params, (err, data) => {
                if (err) {
                    console.error('DynamoDB delete エラー:', err);
                    reject(new Error(`ジョブ削除に失敗しました: ${err.message}`));
                } else {
                    console.log('ジョブが削除されました:', jobId);
                    resolve(data);
                }
            });
        });
    }
    
    // エラーハンドリング付きの再試行機能
    async retryOperation(operation, maxRetries = 3, delay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                console.warn(`操作失敗 (試行 ${i + 1}/${maxRetries}):`, error.message);
                
                if (i === maxRetries - 1) {
                    throw error; // 最後の試行で失敗した場合は例外を投げる
                }
                
                // 指数バックオフで待機
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
            }
        }
    }
}

// グローバルインスタンス
window.dynamoClient = new DynamoClient();