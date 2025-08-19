# File Upload Server

A modern, feature-rich file upload server built with Node.js and Express. This server provides a beautiful web interface for file uploads with real-time progress tracking, drag-and-drop functionality, and comprehensive file management.

## 🚀 Features

### Core Features
- **Real-time Upload Progress** - See actual upload progress with speed and time tracking
- **Drag & Drop Interface** - Modern drag-and-drop file upload experience
- **Multiple File Support** - Upload multiple files simultaneously
- **File Management** - View, download, and delete uploaded files
- **Network Access** - Accessible from any device on your local network
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile devices

### Technical Features
- **Real-time Progress Tracking** - Server-side progress monitoring with detailed statistics
- **File Size Limits** - Configurable file size limits (default: 100GB)
- **Automatic File Naming** - Prevents filename conflicts with timestamp suffixes
- **CORS Support** - Cross-origin resource sharing enabled for network access
- **Comprehensive Logging** - Detailed server-side logging with upload statistics
- **Error Handling** - Robust error handling with user-friendly messages

## 📋 Requirements

- Node.js (version 14 or higher)
- npm (comes with Node.js)

## 🛠️ Installation

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd upload-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

## 🌐 Usage

### Starting the Server

After installation, the server will start and display:
- Local access URL (http://localhost:3000)
- Network access URLs for other devices on your network
- Upload directory path

### Uploading Files

1. **Open the web interface** in your browser
2. **Drag and drop files** onto the upload area, or click "选择文件" to browse
3. **Watch real-time progress** with detailed statistics:
   - Upload percentage
   - File size (uploaded/total)
   - Upload speed (MB/s)
   - Elapsed time
4. **View uploaded files** in the file list section

### File Management

- **View Files**: See all uploaded files with size and upload time
- **Download Files**: Click the download icon to download any file
- **Delete Files**: Click the trash icon to remove files from the server
- **Refresh List**: Click the refresh button to update the file list

## 📁 File Storage

- **Upload Directory**: Files are stored in the `uploads/` folder
- **File Naming**: Original filenames are preserved with timestamp suffixes to prevent conflicts
- **Organization**: All files are stored in a single directory for easy access