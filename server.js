const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// 启用CORS，允许内网访问
app.use(cors());

// 解析JSON请求体
app.use(express.json());

// 简单的HTTP请求日志中间件
app.use((req, res, next) => {
    const start = Date.now();
    const timestamp = new Date().toISOString();
    
    // 记录请求开始
    console.log(`📡 [${timestamp}] ${req.method} ${req.url} - 开始处理`);
    
    // 监听响应完成
    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const statusIcon = status >= 400 ? '❌' : status >= 300 ? '🔄' : '✅';
        console.log(`${statusIcon} [${timestamp}] ${req.method} ${req.url} - ${status} (${duration}ms)`);
    });
    
    next();
});

// 创建上传目录
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // 保持原始文件名，添加时间戳避免重复
        const timestamp = Date.now();
        const originalName = file.originalname;
        const ext = path.extname(originalName);
        const name = path.basename(originalName, ext);
        cb(null, `${name}_${timestamp}${ext}`);
    }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
    // 允许所有文件类型，你也可以在这里添加限制
    cb(null, true);
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024 * 1024 // 100GB限制
    }
});

// 自定义上传进度中间件
const uploadWithProgress = (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length']);
    const totalSize = contentLength || 0;
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    console.log(`🚀 开始上传文件: ${totalSizeMB} MB`);
    
    const startTime = Date.now();
    let receivedBytes = 0;
    let lastLogTime = startTime;
    
    req.on('data', (chunk) => {
        receivedBytes += chunk.length;
        const currentTime = Date.now();
        
        if (currentTime - lastLogTime > 1000) { // 每秒记录一次进度
            const elapsed = (currentTime - startTime) / 1000;
            const receivedMB = (receivedBytes / (1024 * 1024)).toFixed(2);
            const progress = totalSize > 0 ? Math.round((receivedBytes / totalSize) * 100) : 0;
            const speed = (receivedBytes / (1024 * 1024) / elapsed).toFixed(2);
            
            console.log(`⏳ 上传进度: ${progress}% (${receivedMB}/${totalSizeMB} MB) - 速度: ${speed} MB/s`);
            lastLogTime = currentTime;
        }
    });
    
    req.on('end', () => {
        const totalTime = (Date.now() - startTime) / 1000;
        const avgSpeed = (receivedBytes / (1024 * 1024) / totalTime).toFixed(2);
        console.log(`✅ 文件接收完成: ${(receivedBytes / (1024 * 1024)).toFixed(2)} MB (总用时: ${totalTime.toFixed(1)}s, 平均速度: ${avgSpeed} MB/s)`);
    });
    
    next();
};

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 文件上传接口
app.post('/upload', uploadWithProgress, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            console.log('❌ 文件上传失败: 没有选择文件');
            return res.status(400).json({ 
                success: false, 
                message: '没有选择文件' 
            });
        }

        const fileSize = req.file.size;
        const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
        const timestamp = new Date().toLocaleString('zh-CN');
        
        console.log(`📁 文件上传成功 [${timestamp}]`);
        console.log(`   📄 原始文件名: ${req.file.originalname}`);
        console.log(`   💾 保存文件名: ${req.file.filename}`);
        console.log(`   📏 文件大小: ${fileSizeMB} MB (${fileSize.toLocaleString()} bytes)`);
        console.log(`   📂 保存路径: ${req.file.path}`);
        console.log(`   🆔 MIME类型: ${req.file.mimetype}`);
        
        res.json({
            success: true,
            message: '文件上传成功',
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            path: req.file.path
        });
    } catch (error) {
        console.error('❌ 文件上传错误:', error);
        res.status(500).json({ 
            success: false, 
            message: '上传失败: ' + error.message 
        });
    }
});

// 获取已上传文件列表
app.get('/files', (req, res) => {
    try {
        const files = fs.readdirSync(uploadDir);
        const fileList = files.map(filename => {
            const filePath = path.join(uploadDir, filename);
            const stats = fs.statSync(filePath);
            return {
                filename: filename,
                size: stats.size,
                uploadTime: stats.mtime,
                path: filePath
            };
        });
        
        console.log(`📋 获取文件列表: 找到 ${fileList.length} 个文件`);
        
        res.json({
            success: true,
            files: fileList
        });
    } catch (error) {
        console.error('❌ 获取文件列表错误:', error);
        res.status(500).json({ 
            success: false, 
            message: '获取文件列表失败' 
        });
    }
});

// 下载文件
app.get('/download/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(uploadDir, filename);
        
        if (!fs.existsSync(filePath)) {
            console.log(`❌ 文件下载失败: ${filename} 不存在`);
            return res.status(404).json({ 
                success: false, 
                message: '文件不存在' 
            });
        }
        
        console.log(`⬇️ 文件下载: ${filename}`);
        res.download(filePath);
    } catch (error) {
        console.error('❌ 文件下载错误:', error);
        res.status(500).json({ 
            success: false, 
            message: '下载失败' 
        });
    }
});

// 删除文件
app.delete('/files/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(uploadDir, filename);
        
        if (!fs.existsSync(filePath)) {
            console.log(`❌ 文件删除失败: ${filename} 不存在`);
            return res.status(404).json({ 
                success: false, 
                message: '文件不存在' 
            });
        }
        
        fs.unlinkSync(filePath);
        console.log(`🗑️ 文件删除成功: ${filename}`);
        res.json({ 
            success: true, 
            message: '文件删除成功' 
        });
    } catch (error) {
        console.error('❌ 文件删除错误:', error);
        res.status(500).json({ 
            success: false, 
            message: '删除失败' 
        });
    }
});

// 主页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 获取服务器信息
app.get('/server-info', (req, res) => {
    const networkInterfaces = os.networkInterfaces();
    const localIPs = [];
    
    Object.keys(networkInterfaces).forEach(interfaceName => {
        networkInterfaces[interfaceName].forEach(interface => {
            if (interface.family === 'IPv4' && !interface.internal) {
                localIPs.push(interface.address);
            }
        });
    });
    
    res.json({
        port: PORT,
        localIPs: localIPs,
    });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    const networkInterfaces = os.networkInterfaces();
    console.log(`🚀 文件上传服务器已启动!`);
    console.log(`📱 本地访问: http://localhost:${PORT}`);
    
    // 显示内网IP地址
    Object.keys(networkInterfaces).forEach(interfaceName => {
        networkInterfaces[interfaceName].forEach(interface => {
            if (interface.family === 'IPv4' && !interface.internal) {
                console.log(`🌐 内网访问: http://${interface.address}:${PORT}`);
            }
        });
    });
    
    console.log(`📁 文件保存目录: ${uploadDir}`);
    console.log(`💡 按 Ctrl+C 停止服务器`);
}); 