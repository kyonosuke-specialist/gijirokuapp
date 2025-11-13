class ResultManager {
    constructor() {
        this.jobId = null;
        this.init();
    }

    async init() {
        // URLパラメータからjobIdを取得
        const urlParams = new URLSearchParams(window.location.search);
        this.jobId = urlParams.get('jobId');
        
        if (!this.jobId) {
            alert('ジョブIDが指定されていません');
            window.location.href = 'index.html';
            return;
        }

        // 認証完了まで待機
        await this.waitForAuth();

        // イベントリスナー設定
        this.setupEventListeners();
        
        // 結果データ読み込み
        await this.loadResults();
    }

    async waitForAuth() {
        let attempts = 0;
        const maxAttempts = 100;
        
        while (attempts < maxAttempts) {
            if (window.authManager && window.authManager.isLoggedIn() && window.s3Client && window.dynamoClient) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
    }

    setupEventListeners() {
        document.getElementById('back-btn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        document.getElementById('download-txt').addEventListener('click', () => {
            this.downloadTranscript('txt');
        });

        document.getElementById('download-md').addEventListener('click', () => {
            this.downloadTranscript('md');
        });

        document.getElementById('download-summary').addEventListener('click', () => {
            this.downloadSummary();
        });
    }

    async loadResults() {
        try {
            // ジョブ情報取得
            const job = await this.dynamoClient.getJob(this.jobId);
            if (!job || job.status !== 'COMPLETED') {
                document.getElementById('summary-content').innerHTML = '<p class="error">結果がまだ準備できていません</p>';
                document.getElementById('transcript-content').innerHTML = '<p class="error">結果がまだ準備できていません</p>';
                return;
            }

            // ファイル名をタイトルに設定
            document.getElementById('result-title').textContent = `結果表示 - ${job.file_name}`;

            // 各結果を並行読み込み
            await Promise.all([
                this.loadTranscript(),
                this.loadSummary(),
                this.loadSentiment()
            ]);

        } catch (error) {
            console.error('結果読み込みエラー:', error);
            document.getElementById('summary-content').innerHTML = '<p class="error">結果の読み込みに失敗しました</p>';
            document.getElementById('transcript-content').innerHTML = '<p class="error">結果の読み込みに失敗しました</p>';
        }
    }

    async loadTranscript() {
        try {
            const key = `output-transcribe/${this.jobId}.json`;
            const data = await window.s3Client.getFileContent(key);
            const transcriptData = JSON.parse(data);
            
            // Transcribeの結果から文字起こしテキストを抽出
            let transcript = '';
            if (transcriptData.results && transcriptData.results.transcripts) {
                transcript = transcriptData.results.transcripts[0].transcript;
            }
            
            document.getElementById('transcript-content').textContent = transcript || '文字起こし結果がありません';
        } catch (error) {
            console.error('文字起こし読み込みエラー:', error);
            document.getElementById('transcript-content').innerHTML = '<p class="error">文字起こし結果の読み込みに失敗しました</p>';
        }
    }

    async loadSummary() {
        try {
            const key = `output-bedrock/${this.jobId}.md`;
            const summary = await window.s3Client.getFileContent(key);
            document.getElementById('summary-content').textContent = summary || '要約結果がありません';
        } catch (error) {
            console.error('要約読み込みエラー:', error);
            document.getElementById('summary-content').innerHTML = '<p class="error">要約結果の読み込みに失敗しました</p>';
        }
    }

    async loadSentiment() {
        try {
            const key = `output-comprehend/${this.jobId}.json`;
            const data = await window.s3Client.getFileContent(key);
            const sentimentData = JSON.parse(data);
            
            if (sentimentData.SentimentScore) {
                const scores = sentimentData.SentimentScore;
                document.getElementById('positive-score').textContent = (scores.Positive * 100).toFixed(1) + '%';
                document.getElementById('negative-score').textContent = (scores.Negative * 100).toFixed(1) + '%';
                document.getElementById('neutral-score').textContent = (scores.Neutral * 100).toFixed(1) + '%';
                document.getElementById('mixed-score').textContent = (scores.Mixed * 100).toFixed(1) + '%';
            }
        } catch (error) {
            console.error('感情分析読み込みエラー:', error);
            document.getElementById('sentiment-content').innerHTML = '<p class="error">感情分析結果の読み込みに失敗しました</p>';
        }
    }

    async downloadTranscript(format) {
        try {
            const key = `output-transcribe/${this.jobId}.json`;
            const data = await window.s3Client.getFileContent(key);
            const transcriptData = JSON.parse(data);
            
            let transcript = '';
            if (transcriptData.results && transcriptData.results.transcripts) {
                transcript = transcriptData.results.transcripts[0].transcript;
            }

            const job = await window.dynamoClient.getJob(this.jobId);
            const fileName = job ? job.file_name.replace(/\.[^/.]+$/, '') : this.jobId;
            
            if (format === 'txt') {
                this.downloadFile(transcript, `${fileName}_文字起こし.txt`, 'text/plain');
            } else if (format === 'md') {
                const markdown = `# 文字起こし結果\n\n**ファイル名**: ${job ? job.file_name : 'Unknown'}\n**作成日時**: ${new Date().toLocaleString('ja-JP')}\n\n## 内容\n\n${transcript}`;
                this.downloadFile(markdown, `${fileName}_文字起こし.md`, 'text/markdown');
            }
        } catch (error) {
            console.error('ダウンロードエラー:', error);
            alert('ダウンロードに失敗しました');
        }
    }

    async downloadSummary() {
        try {
            const key = `output-bedrock/${this.jobId}.md`;
            const summary = await window.s3Client.getFileContent(key);
            
            const job = await window.dynamoClient.getJob(this.jobId);
            const fileName = job ? job.file_name.replace(/\.[^/.]+$/, '') : this.jobId;
            
            this.downloadFile(summary, `${fileName}_議事録要約.md`, 'text/markdown');
        } catch (error) {
            console.error('要約ダウンロードエラー:', error);
            alert('要約のダウンロードに失敗しました');
        }
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    window.resultManager = new ResultManager();
});