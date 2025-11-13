// プログレス管理
class ProgressManager {
    constructor() {
        this.currentJobId = null;
        this.pollInterval = null;
    }
    
    startMonitoring(jobId) {
        this.currentJobId = jobId;
        this.showProgressSection();
        this.pollInterval = setInterval(() => this.updateProgress(), 3000);
    }
    
    stopMonitoring() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }
    
    showProgressSection() {
        document.getElementById('progress-section').style.display = 'block';
    }
    
    hideProgressSection() {
        document.getElementById('progress-section').style.display = 'none';
    }
    
    async updateProgress() {
        try {
            console.log('ポーリング中 - Job ID:', this.currentJobId);
            const job = await window.dynamoClient.getJob(this.currentJobId);
            
            if (!job) {
                console.warn('ジョブが見つかりません:', this.currentJobId);
                return;
            }
            
            console.log('取得したジョブステータス:', job.status);
            this.updateProgressUI(job.status);
            
            if (job.status === 'COMPLETED' || job.status === 'ERROR') {
                console.log('処理完了 - ステータス:', job.status);
                this.stopMonitoring();
                if (job.status === 'COMPLETED') {
                    this.showCompletionMessage();
                }
            }
        } catch (error) {
            console.error('進捗更新エラー:', error);
        }
    }
    
    updateProgressUI(status) {
        const statusMap = {
            'UPLOADED': { percent: 20, step: 'upload', text: 'アップロード完了' },
            'TRANSCRIBING': { percent: 40, step: 'transcribe', text: '文字起こし中...' },
            'SUMMARIZING': { percent: 60, step: 'summarize', text: '要約生成中...' },
            'ANALYZING': { percent: 80, step: 'analyze', text: '感情分析中...' },
            'COMPLETED': { percent: 100, step: 'complete', text: '処理完了！' }
        };
        
        const progress = statusMap[status] || statusMap['UPLOADED'];
        
        // プログレスバー更新
        document.getElementById('progress-fill').style.width = progress.percent + '%';
        document.getElementById('progress-text').textContent = progress.text;
        
        // ステップアイコン更新
        const steps = ['upload', 'transcribe', 'summarize', 'analyze', 'complete'];
        const currentIndex = steps.indexOf(progress.step);
        
        steps.forEach((step, index) => {
            const element = document.getElementById(`step-${step}`);
            element.classList.remove('active', 'completed');
            if (index < currentIndex) {
                element.classList.add('completed');
            } else if (index === currentIndex) {
                element.classList.add('active');
            }
        });
    }
    
    showCompletionMessage() {
        alert('処理が完了しました！ダウンロードセクションからファイルを取得できます。');
    }
}

// シンプルなダウンロード管理
class JobManager {
    constructor() {
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // ダウンロードボタンのイベントリスナー
        const downloadTranscriptBtn = document.getElementById('download-transcript');
        const downloadSummaryBtn = document.getElementById('download-summary');
        const downloadSentimentBtn = document.getElementById('download-sentiment');
        const jobIdInput = document.getElementById('job-id-input');
        
        if (downloadTranscriptBtn) {
            downloadTranscriptBtn.addEventListener('click', () => {
                const jobId = jobIdInput.value.trim();
                if (jobId) {
                    this.downloadTranscript(jobId);
                } else {
                    alert('ジョブIDを入力してください');
                }
            });
        }
        
        if (downloadSummaryBtn) {
            downloadSummaryBtn.addEventListener('click', () => {
                const jobId = jobIdInput.value.trim();
                if (jobId) {
                    this.downloadSummary(jobId);
                } else {
                    alert('ジョブIDを入力してください');
                }
            });
        }
        
        if (downloadSentimentBtn) {
            downloadSentimentBtn.addEventListener('click', () => {
                const jobId = jobIdInput.value.trim();
                if (jobId) {
                    this.downloadSentiment(jobId);
                } else {
                    alert('ジョブIDを入力してください');
                }
            });
        }
    }
    
    // ジョブ追加（アップロード時に呼び出される）
    addJob(fileName, jobId = null) {
        const generatedJobId = jobId || this.generateJobId(fileName);
        
        // ジョブIDから拡張子を除去して表示
        const cleanJobId = this.getCleanJobId(generatedJobId);
        const jobIdInput = document.getElementById('job-id-input');
        if (jobIdInput) {
            jobIdInput.value = cleanJobId;
        }
        
        alert(`ファイルがアップロードされました。\nジョブID: ${cleanJobId}\n\n処理完了後、このジョブIDを使用してファイルをダウンロードできます。`);
        
        return generatedJobId;
    }
    
    // 個別ダウンロード機能
    async downloadTranscript(jobId) {
        try {
            const cleanJobId = this.getCleanJobId(jobId);
            const s3Key = `output-transcribe/transcribe_${cleanJobId}.txt`;
            console.log('文字起こしダウンロード試行:', s3Key);
            
            const transcriptText = await window.s3Client.getFileContent(s3Key);
            const fileName = this.extractFileName(jobId) || jobId;
            this.downloadFileContent(transcriptText, `${fileName}_文字起こし.txt`, 'text/plain; charset=utf-8');
            alert('文字起こしファイルをダウンロードしました');
        } catch (e) {
            console.error('ダウンロードエラー詳細:', e);
            alert(`文字起こしファイルのダウンロードに失敗しました: ${e.message}`);
        }
    }
    
    async downloadSummary(jobId) {
        try {
            const cleanJobId = this.getCleanJobId(jobId);
            const s3Key = `output-bedrock/summary_${cleanJobId}.html`;
            console.log('要約ダウンロード試行:', s3Key);
            
            const summaryText = await window.s3Client.getFileContent(s3Key);
            const fileName = this.extractFileName(jobId) || jobId;
            this.downloadFileContent(summaryText, `${fileName}_議事録要約.html`, 'text/plain; charset=utf-8');
            alert('議事録要約をダウンロードしました');
        } catch (e) {
            console.error('要約ダウンロードエラー:', e);
            alert(`議事録要約のダウンロードに失敗しました: ${e.message}`);
        }
    }
    
    async downloadSentiment(jobId) {
        try {
            const cleanJobId = this.getCleanJobId(jobId);
            const s3Key = `output-comprehend/comprehend_${cleanJobId}.tar.gz`;
            console.log('感情分析ダウンロード試行:', s3Key);
            
            // S3からオブジェクト取得（AWS SDK v3想定）
            const sentimentText = await window.s3Client.getFileContent(s3Key);

            const fileName = this.extractFileName(jobId) || jobId;
            this.downloadFileContent(sentimentText, `${fileName}_感情分析.tar.gz`, 'application/gzip');
            alert('感情分析ファイルをダウンロードしました');

        } catch (e) {
            console.error('感情分析ダウンロードエラー:', e);
            alert(`感情分析ファイルのダウンロードに失敗しました: ${e.message}`);
        }
    }
    
    // ジョブIDからファイル名部分を除去したクリーンなIDを取得 
    getCleanJobId(jobId) {
        const parts = jobId.split('_');
        if (parts.length >= 3) {
            return parts.slice(0, 3).join('_');
        }
        return jobId;
    }
    
    // ジョブIDからファイル名を抽出
    extractFileName(jobId) {
        const parts = jobId.split('_');
        if (parts.length >= 4) {
            return parts.slice(3).join('_');
        }
        return null;
    }
    

    
    // ファイル内容をダウンロード
    downloadFileContent(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
    
    generateJobId(fileName) {
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
        return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) + '_' + nameWithoutExt;
    }
}



// ページ初期化
document.addEventListener('DOMContentLoaded', () => {
    // ProgressManagerを初期化
    window.progressManager = new ProgressManager();
    
    // JobManagerを先に初期化（認証待ち機能付き）
    window.jobManager = new JobManager();
    
    // ログアウトボタン
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('ログアウトしますか？')) {
                if (window.authManager) {
                    window.authManager.logout();
                } else {
                    localStorage.clear();
                    alert('ログアウトしました');
                    window.location.reload();
                }
            }
        });
    }
});