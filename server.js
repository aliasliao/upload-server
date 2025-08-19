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
        fileSize: 100 * 1024 * 1024 // 100MB限制
    }
});

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 文件上传接口
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: '没有选择文件' 
            });
        }

        res.json({
            success: true,
            message: '文件上传成功',
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            path: req.file.path
        });
    } catch (error) {
        console.error('上传错误:', error);
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
        
        res.json({
            success: true,
            files: fileList
        });
    } catch (error) {
        console.error('获取文件列表错误:', error);
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
            return res.status(404).json({ 
                success: false, 
                message: '文件不存在' 
            });
        }
        
        res.download(filePath);
    } catch (error) {
        console.error('下载错误:', error);
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
            return res.status(404).json({ 
                success: false, 
                message: '文件不存在' 
            });
        }
        
        fs.unlinkSync(filePath);
        res.json({ 
            success: true, 
            message: '文件删除成功' 
        });
    } catch (error) {
        console.error('删除错误:', error);
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