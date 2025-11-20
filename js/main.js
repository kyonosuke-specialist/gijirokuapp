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
            this.updateProgressUI(job);
            this.updateDownloadButtons(job);
            
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
    
    updateDownloadButtons(job) {
        const transcriptBtn = document.getElementById('download-transcript');
        const summaryBtn = document.getElementById('download-summary');
        const sentimentBtn = document.getElementById('download-sentiment');
        
        if (transcriptBtn) transcriptBtn.disabled = !job.transcript_s3_key;
        if (summaryBtn) summaryBtn.disabled = !job.summary_s3_key;
        if (sentimentBtn) sentimentBtn.disabled = !job.sentiment_s3_key;
    }
    
    updateProgressUI(job) {
        // transcript_s3_keyの存在で文字起こし完了を判定
        if (job.transcript_s3_key) {
            this.updateClock('transcribe', 'completed', '完了');
        } else if (job.status === 'TRANSCRIBING') {
            this.updateClock('transcribe', 'processing', '処理中...');
        } else {
            this.updateClock('transcribe', 'waiting', '待機中');
        }
        
        // summary_s3_keyの存在で要約完了を判定
        if (job.summary_s3_key) {
            this.updateClock('summarize', 'completed', '完了');
        } else if (job.status === 'SUMMARIZING' || job.status === 'ANALYZING') {
            this.updateClock('summarize', 'processing', '処理中...');
        } else {
            this.updateClock('summarize', 'waiting', '待機中');
        }
        
        // sentiment_s3_keyの存在で感情分析完了を判定
        if (job.sentiment_s3_key) {
            this.updateClock('analyze', 'completed', '完了');
        } else if (job.status === 'ANALYZING') {
            this.updateClock('analyze', 'processing', '処理中...');
        } else {
            this.updateClock('analyze', 'waiting', '待機中');
        }
    }
    
    updateClock(clockId, state, statusText) {
        const element = document.getElementById(`clock-${clockId}`);
        element.classList.remove('processing', 'completed', 'waiting');
        element.classList.add(state);
        const statusEl = element.querySelector('.clock-status');
        statusEl.textContent = statusText;
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
    addJob(fileName, jobId) {
        // ジョブ情報表示エリアを表示
        const jobInfoDisplay = document.getElementById('job-info-display');
        const fileNameLabel = document.getElementById('file-name-label');
        const jobIdLabel = document.getElementById('job-id-label');
        
        if (jobInfoDisplay && fileNameLabel && jobIdLabel) {
            jobInfoDisplay.style.display = 'block';
            fileNameLabel.textContent = fileName;
            jobIdLabel.textContent = jobId;
        }
        
        // 入力フィールドにも設定
        const jobIdInput = document.getElementById('job-id-input');
        if (jobIdInput) {
            jobIdInput.value = jobId;
        }
        
        alert(`ファイルがアップロードされました。\nファイル名: ${fileName}\nジョブID: ${jobId}\n\n処理完了後、このジョブIDを使用してファイルをダウンロードできます。`);
        
        return jobId;
    }
    
    // 個別ダウンロード機能（jobId = BaseFileName）
    async downloadTranscript(jobId) {
        try {
            const s3Key = `output-transcribe/transcribe_${jobId}.txt`;
            const transcriptText = await window.s3Client.getFileContent(s3Key);
            this.downloadFileContent(transcriptText, `${jobId}_文字起こし.txt`, 'text/plain; charset=utf-8');
            alert('文字起こしファイルをダウンロードしました');
        } catch (e) {
            console.error('ダウンロードエラー:', e);
            alert(`文字起こしファイルのダウンロードに失敗しました: ${e.message}`);
        }
    }
    
    async downloadSummary(jobId) {
        try {
            const s3Key = `output-bedrock/summary_${jobId}.html`;
            const summaryText = await window.s3Client.getFileContent(s3Key);
            this.downloadFileContent(summaryText, `${jobId}_議事録要約.html`, 'text/plain; charset=utf-8');
            alert('議事録要約をダウンロードしました');
        } catch (e) {
            console.error('要約ダウンロードエラー:', e);
            alert(`議事録要約のダウンロードに失敗しました: ${e.message}`);
        }
    }
    
    async downloadSentiment(jobId) {
        try {
            const s3Key = `output-comprehend/comprehend_${jobId}.tar.gz`;
            const sentimentText = await window.s3Client.getFileContent(s3Key);
            this.downloadFileContent(sentimentText, `${jobId}_感情分析.tar.gz`, 'application/gzip');
            alert('感情分析ファイルをダウンロードしました');
        } catch (e) {
            console.error('感情分析ダウンロードエラー:', e);
            alert(`感情分析ファイルのダウンロードに失敗しました: ${e.message}`);
        }
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