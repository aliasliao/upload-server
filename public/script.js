// 全局变量
let currentUploads = new Map();

// DOM元素
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const selectBtn = document.getElementById('selectBtn');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const uploadStatus = document.getElementById('uploadStatus');
const uploadDetails = document.getElementById('uploadDetails');
const uploadedSize = document.getElementById('uploadedSize');
const totalSize = document.getElementById('totalSize');
const uploadSpeed = document.getElementById('uploadSpeed');
const elapsedTime = document.getElementById('elapsedTime');
const filesContainer = document.getElementById('filesContainer');
const serverInfo = document.getElementById('serverInfo');
const notification = document.getElementById('notification');

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    loadServerInfo();
    loadFiles();
    setupEventListeners();
});

// 设置事件监听器
function setupEventListeners() {
    // 拖拽上传
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // 点击上传区域触发文件选择（排除按钮区域）
    uploadArea.addEventListener('click', handleUploadAreaClick);
    
    // 选择文件按钮点击事件
    selectBtn.addEventListener('click', () => fileInput.click());

    // 文件选择
    fileInput.addEventListener('change', handleFileSelect);
}

// 处理拖拽悬停
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

// 处理拖拽离开
function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

// 处理文件拖拽
function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
        uploadFiles(files);
    }
}

// 处理上传区域点击
function handleUploadAreaClick(e) {
    // 如果点击的是按钮，不触发文件选择
    if (e.target.closest('.select-btn')) {
        return;
    }
    
    // 触发文件选择
    fileInput.click();
}

// 处理文件选择
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        uploadFiles(files);
    }
}

// 上传文件
async function uploadFiles(files) {
    showUploadProgress();
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await uploadSingleFile(file, i + 1, files.length);
    }
    
    // 上传完成后刷新文件列表
    setTimeout(() => {
        hideUploadProgress();
        loadFiles();
        showNotification('所有文件上传完成！', 'success');
    }, 1000);
}

// 上传单个文件
async function uploadSingleFile(file, currentIndex, totalFiles) {
    const formData = new FormData();
    formData.append('file', file);
    
    const uploadId = Date.now() + Math.random();
    currentUploads.set(uploadId, { file, progress: 0 });
    
    try {
        updateUploadStatus(`正在上传 ${file.name} (${currentIndex}/${totalFiles})`);
        
        const xhr = new XMLHttpRequest();
        let startTime = Date.now();
        let lastProgressUpdate = 0;
        
        // 监听上传开始
        xhr.upload.addEventListener('loadstart', () => {
            console.log(`🚀 开始上传: ${file.name}`);
            startTime = Date.now();
            lastProgressUpdate = startTime;
        });
        
        // 监听上传进度 - 这是真实的上传进度
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const currentTime = Date.now();
                const progress = Math.round((e.loaded / e.total) * 100);
                const receivedMB = (e.loaded / (1024 * 1024)).toFixed(2);
                const totalMB = (e.total / (1024 * 1024)).toFixed(2);
                const elapsed = (currentTime - startTime) / 1000;
                
                // 计算上传速度
                let speed = '0.00';
                if (elapsed > 0) {
                    speed = (e.loaded / (1024 * 1024) / elapsed).toFixed(2);
                }
                
                // 更新进度条和详细信息
                updateProgress(progress);
                updateUploadDetails(receivedMB, totalMB, progress);
                updateUploadStatus(`正在上传 ${file.name} (${currentIndex}/${totalFiles}) - ${progress}% (${receivedMB}/${totalMB} MB) - 速度: ${speed} MB/s`);
                
                // 每500ms在控制台输出一次详细进度
                if (currentTime - lastProgressUpdate > 500) {
                    console.log(`📊 真实上传进度 - ${file.name}: ${progress}% (${receivedMB}/${totalMB} MB) - 速度: ${speed} MB/s - 已用时: ${elapsed.toFixed(1)}s`);
                    lastProgressUpdate = currentTime;
                }
                
                currentUploads.get(uploadId).progress = progress;
            }
        });
        
        // 监听上传完成
        xhr.addEventListener('load', () => {
            const totalTime = (Date.now() - startTime) / 1000;
            
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    updateUploadStatus(`✅ ${file.name} 上传成功 - 总用时: ${totalTime.toFixed(1)}s`);
                    showNotification(`${file.name} 上传成功`, 'success');
                    
                    // 显示服务器端的最终统计信息
                    if (response.finalProgress) {
                        console.log(`📁 服务器端统计 - ${file.name}: ${response.finalProgress.receivedMB} MB, 平均速度: ${response.finalProgress.speed} MB/s`);
                    }
                } else {
                    updateUploadStatus(`❌ ${file.name} 上传失败: ${response.message}`);
                    showNotification(`${file.name} 上传失败: ${response.message}`, 'error');
                }
            } else {
                updateUploadStatus(`❌ ${file.name} 上传失败`);
                showNotification(`${file.name} 上传失败`, 'error');
            }
            currentUploads.delete(uploadId);
        });
        
        // 监听上传错误
        xhr.addEventListener('error', () => {
            updateUploadStatus(`❌ ${file.name} 上传失败`);
            showNotification(`${file.name} 上传失败`, 'error');
            currentUploads.delete(uploadId);
        });
        
        xhr.open('POST', '/upload');
        xhr.send(formData);
        
    } catch (error) {
        updateUploadStatus(`❌ ${file.name} 上传失败: ${error.message}`);
        showNotification(`${file.name} 上传失败: ${error.message}`, 'error');
        currentUploads.delete(uploadId);
    }
}

// 从服务器进度更新UI
function updateProgressFromServer(progress, fileName) {
    if (progress) {
        updateProgress(progress.progress);
        updateUploadDetails(progress.receivedMB, progress.totalMB, progress.progress);
        updateUploadStatus(`正在上传 ${fileName} - ${progress.progress}% (${progress.receivedMB}/${progress.totalMB} MB) - 速度: ${progress.speed} MB/s`);
        
        if (progress.status === 'completed') {
            updateUploadStatus(`✅ ${fileName} 上传完成 - 总用时: ${progress.elapsed}s, 平均速度: ${progress.speed} MB/s`);
        }
    }
}

// 获取服务器端上传进度
async function getServerProgress(uploadId, fileName) {
    try {
        const response = await fetch(`/upload-progress/${uploadId}`);
        const data = await response.json();
        
        if (data.success && data.progress) {
            const progress = data.progress;
            console.log(`📊 服务器端进度 - ${fileName}: ${progress.progress}% (${progress.receivedMB}/${progress.totalMB} MB) - 速度: ${progress.speed} MB/s`);
            
            if (progress.status === 'completed') {
                updateUploadStatus(`✅ ${fileName} 上传完成 - 总用时: ${progress.elapsed}s, 平均速度: ${progress.speed} MB/s`);
            }
        }
    } catch (error) {
        console.error('获取服务器进度失败:', error);
    }
}

// 显示上传进度
function showUploadProgress() {
    uploadProgress.style.display = 'block';
    uploadDetails.style.display = 'none';
    updateProgress(0);
    updateUploadStatus('准备上传...');
    window.uploadStartTime = null;
}

// 隐藏上传进度
function hideUploadProgress() {
    uploadProgress.style.display = 'none';
    uploadDetails.style.display = 'none';
}

// 更新进度条
function updateProgress(percent) {
    progressFill.style.width = percent + '%';
    progressText.textContent = percent + '%';
}

// 更新上传状态
function updateUploadStatus(message) {
    uploadStatus.textContent = message;
}

// 更新上传详细信息
function updateUploadDetails(receivedMB, totalMB, progress) {
    uploadedSize.textContent = receivedMB + ' MB';
    totalSize.textContent = totalMB + ' MB';
    uploadDetails.style.display = 'grid';
    
    // 计算上传速度（简化版本）
    const currentTime = Date.now();
    if (!window.uploadStartTime) {
        window.uploadStartTime = currentTime;
    }
    
    const elapsed = (currentTime - window.uploadStartTime) / 1000;
    const speed = elapsed > 0 ? (parseFloat(receivedMB) / elapsed).toFixed(2) : '0.00';
    
    uploadSpeed.textContent = speed + ' MB/s';
    elapsedTime.textContent = elapsed.toFixed(1) + 's';
}

// 加载服务器信息
async function loadServerInfo() {
    try {
        const response = await fetch('/server-info');
        const data = await response.json();
        
        const infoHtml = `
            <div class="info">
                <div>端口: ${data.port}</div>
                <div>内网地址: ${data.localIPs.join(', ')}</div>
            </div>
        `;
        
        serverInfo.innerHTML = infoHtml;
    } catch (error) {
        serverInfo.innerHTML = '<span class="error">无法获取服务器信息</span>';
    }
}

// 加载文件列表
async function loadFiles() {
    try {
        filesContainer.innerHTML = '<div class="loading">正在加载文件列表...</div>';
        
        const response = await fetch('/files');
        const data = await response.json();
        
        if (data.success) {
            displayFiles(data.files);
        } else {
            filesContainer.innerHTML = '<div class="error">加载文件列表失败</div>';
        }
    } catch (error) {
        filesContainer.innerHTML = '<div class="error">加载文件列表失败</div>';
    }
}

// 显示文件列表
function displayFiles(files) {
    if (files.length === 0) {
        filesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>暂无上传的文件</p>
            </div>
        `;
        return;
    }
    
    const filesHtml = files.map(file => {
        const fileIcon = getFileIcon(file.filename);
        const fileSize = formatFileSize(file.size);
        const uploadTime = new Date(file.uploadTime).toLocaleString('zh-CN');
        
        return `
            <div class="file-item">
                <i class="file-icon ${fileIcon}"></i>
                <div class="file-info">
                    <div class="file-name">${file.filename}</div>
                    <div class="file-meta">
                        <span>大小: ${fileSize}</span>
                        <span>上传时间: ${uploadTime}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="action-btn download" onclick="downloadFile('${file.filename}')" title="下载">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteFile('${file.filename}')" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    filesContainer.innerHTML = filesHtml;
}

// 获取文件图标
function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const iconMap = {
        'pdf': 'fas fa-file-pdf',
        'doc': 'fas fa-file-word',
        'docx': 'fas fa-file-word',
        'xls': 'fas fa-file-excel',
        'xlsx': 'fas fa-file-excel',
        'ppt': 'fas fa-file-powerpoint',
        'pptx': 'fas fa-file-powerpoint',
        'txt': 'fas fa-file-alt',
        'jpg': 'fas fa-file-image',
        'jpeg': 'fas fa-file-image',
        'png': 'fas fa-file-image',
        'gif': 'fas fa-file-image',
        'mp4': 'fas fa-file-video',
        'avi': 'fas fa-file-video',
        'mp3': 'fas fa-file-audio',
        'zip': 'fas fa-file-archive',
        'rar': 'fas fa-file-archive',
        '7z': 'fas fa-file-archive'
    };
    
    return iconMap[ext] || 'fas fa-file';
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 下载文件
function downloadFile(filename) {
    window.open(`/download/${encodeURIComponent(filename)}`, '_blank');
}

// 删除文件
async function deleteFile(filename) {
    if (!confirm(`确定要删除文件 "${filename}" 吗？`)) {
        return;
    }
    
    try {
        const response = await fetch(`/files/${encodeURIComponent(filename)}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('文件删除成功', 'success');
            loadFiles();
        } else {
            showNotification('文件删除失败: ' + data.message, 'error');
        }
    } catch (error) {
        showNotification('文件删除失败: ' + error.message, 'error');
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
} 