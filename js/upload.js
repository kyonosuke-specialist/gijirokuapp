// ドラッグ&ドロップアップロード機能
class FileUploader {
    constructor() {
        this.dropArea = document.getElementById('drop-area');
        this.fileInput = document.getElementById('file-input');
        this.fileSelectBtn = document.getElementById('file-select-btn');
        this.uploadStatus = document.getElementById('upload-status');
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // ドラッグ&ドロップイベント
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.dropArea.addEventListener(eventName, this.preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            this.dropArea.addEventListener(eventName, this.highlight.bind(this), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            this.dropArea.addEventListener(eventName, this.unhighlight.bind(this), false);
        });
        
        this.dropArea.addEventListener('drop', this.handleDrop.bind(this), false);
        this.dropArea.addEventListener('click', () => this.fileInput.click());
        
        // ファイル選択イベント
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        this.fileSelectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.fileInput.click();
        });
    }
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    highlight() {
        this.dropArea.classList.add('drag-over');
    }
    
    unhighlight() {
        this.dropArea.classList.remove('drag-over');
    }
    
    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        this.handleFiles(files);
    }
    
    handleFileSelect(e) {
        const files = e.target.files;
        this.handleFiles(files);
    }
    
    handleFiles(files) {
        if (files.length === 0) return;
        
        const file = files[0];
        if (this.validateFile(file)) {
            this.uploadFile(file);
        }
    }
    
    validateFile(file) {
        // MP3/MP4/TXT/VTTファイルチェック
        const validExtensions = ['.mp3', '.mp4', '.txt', '.vtt'];
        const fileName = file.name.toLowerCase();
        
        const isValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
        
        if (!isValidExtension) {
            this.showStatus('MP3、MP4、TXT、VTTファイルのみアップロード可能です', 'error');
            return false;
        }
        
        // ファイルサイズチェック (100MB)
        if (file.size > 100 * 1024 * 1024) {
            this.showStatus('ファイルサイズが100MBを超えています', 'error');
            return false;
        }
        
        return true;
    }
    
    async uploadFile(file) {
        try {
            this.showStatus(`アップロード中: ${file.name}`, 'uploading');
            
            // S3直接アップロード実行
            await this.performS3Upload(file);
            
            this.showStatus(`アップロード完了: ${file.name}`, 'success');
            
            // ファイル入力をリセット
            this.fileInput.value = '';
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showStatus(`アップロードエラー: ${error.message}`, 'error');
        }
    }
    
    // 実際のS3アップロード処理
    async performS3Upload(file) {
        if (!window.s3Client) {
            throw new Error('S3クライアントが初期化されていません');
        }
        
        // プログレス表示用のコールバック
        const onProgress = (percent, loaded, total) => {
            const progressText = `アップロード中: ${file.name} (${Math.round(percent)}%)`;
            this.showStatus(progressText, 'uploading');
        };
        
        // ジョブID生成（タイムスタンプ + ランダム文字列）
        const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // S3キー生成（JobID_元のファイル名）
        const s3Key = `input-data/${jobId}_${file.name}`;
        
        // S3直接アップロード実行
        await window.s3Client.uploadFileDirectly(file, s3Key, onProgress);
        
        // DynamoDBにジョブレコード作成
        if (window.dynamoClient) {
            await window.dynamoClient.createJob({
                job_id: jobId,
                file_name: file.name,
                file_size: file.size,
                file_type: file.type,
                s3_upload_key: s3Key,
                status: 'UPLOADED'
            });
        }
        
        // 処理状況一覧にジョブを追加
        if (window.jobManager) {
            window.jobManager.addJob(file.name, jobId);
        }
        
        // プログレス監視開始
        if (window.progressManager) {
            window.progressManager.startMonitoring(jobId);
        }
    }
    

    
    showStatus(message, type) {
        this.uploadStatus.textContent = message;
        this.uploadStatus.className = `upload-status ${type}`;
        
        // 3秒後に成功メッセージを非表示
        if (type === 'success') {
            setTimeout(() => {
                this.uploadStatus.style.display = 'none';
            }, 3000);
        }
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    window.fileUploader = new FileUploader();
});