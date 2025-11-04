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
        
        const refreshHistoryBtn = document.getElementById('refresh-history-btn');
        if (refreshHistoryBtn) {
            refreshHistoryBtn.addEventListener('click', () => {
                this.loadHistory();
            });
        }
        
        this.loadHistory();
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
            this.downloadFileContent(transcriptText, `${fileName}_文字起こし.txt`, 'text/plain');
            alert('文字起こしファイルをダウンロードしました');
        } catch (e) {
            console.error('ダウンロードエラー詳細:', e);
            alert(`文字起こしファイルのダウンロードに失敗しました: ${e.message}`);
        }
    }
    
    async downloadSummary(jobId) {
        try {
            const cleanJobId = this.getCleanJobId(jobId);
            const s3Key = `output-bedrock/summary_${cleanJobId}.txt`;
            console.log('要約ダウンロード試行:', s3Key);
            
            const summaryText = await window.s3Client.getFileContent(s3Key);
            const fileName = this.extractFileName(jobId) || jobId;
            this.downloadFileContent(summaryText, `${fileName}_議事録要約.txt`, 'text/plain');
            alert('議事録要約をダウンロードしました');
        } catch (e) {
            console.error('要約ダウンロードエラー:', e);
            alert(`議事録要約のダウンロードに失敗しました: ${e.message}`);
        }
    }
    
    async downloadSentiment(jobId) {
        try {
            const cleanJobId = this.getCleanJobId(jobId);
            const s3Key = `output-conprehend/comprehend_${cleanJobId}.txt`;
            console.log('感情分析ダウンロード試行:', s3Key);
            
            const sentimentText = await window.s3Client.getFileContent(s3Key);
            const fileName = this.extractFileName(jobId) || jobId;
            this.downloadFileContent(sentimentText, `${fileName}_感情分析.txt`, 'text/plain');
            alert('感情分析結果をダウンロードしました');
        } catch (e) {
            console.error('感情分析ダウンロードエラー:', e);
            alert(`感情分析結果のダウンロードに失敗しました: ${e.message}`);
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