/**
 * Drag & Drop Manager - Fixed version
 * Xử lý kéo thả files và folders với sửa lỗi
 */

export class DragDropManager {
  constructor(app) {
    this.app = app;
    this.dropOverlay = document.getElementById('dropOverlay');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.dropProgress = document.getElementById('dropProgress');
    
    this.isDragging = false;
    this.dragCounter = 0;
    this.uploadQueue = [];
    this.currentUploads = new Map();
    
    this.init();
  }
  
  init() {
    this.setupGlobalDragDrop();
    this.setupFileTreeDragDrop();
  }
  
  setupGlobalDragDrop() {
    // Ngăn chặn hành vi mặc định trên toàn bộ document
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      document.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
    
    // Hiển thị overlay khi kéo file vào
    document.addEventListener('dragenter', (e) => {
      e.preventDefault();
      this.dragCounter++;
      
      // Chỉ hiển thị overlay khi kéo file (không phải text/links)
      if (e.dataTransfer.types.includes('Files')) {
        if (!this.isDragging) {
          this.showDropOverlay();
          this.isDragging = true;
        }
      }
    });
    
    document.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.dragCounter--;
      
      if (this.dragCounter === 0) {
        this.hideDropOverlay();
        this.isDragging = false;
      }
    });
    
    // Xử lý drop trên document
    document.addEventListener('drop', async (e) => {
      e.preventDefault();
      this.dragCounter = 0;
      this.hideDropOverlay();
      this.isDragging = false;
      
      // Lấy files từ drop event
      const files = this.getFilesFromDrop(e.dataTransfer);
      if (files.length > 0) {
        await this.processDroppedFiles(files);
      }
    });
    
    // Xử lý drop trên overlay
    this.dropOverlay.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const files = this.getFilesFromDrop(e.dataTransfer);
      if (files.length > 0) {
        await this.processDroppedFiles(files);
      }
      
      this.hideDropOverlay();
      this.isDragging = false;
      this.dragCounter = 0;
    });
  }
  
  setupFileTreeDragDrop() {
    // Cho phép drop vào folder trong file tree
    document.addEventListener('dragover', (e) => {
      const folder = e.target.closest('.tree-item.folder');
      if (folder && e.dataTransfer.types.includes('Files')) {
        e.preventDefault();
        e.stopPropagation();
        folder.classList.add('drag-over');
      }
    });
    
    document.addEventListener('dragleave', (e) => {
      const folder = e.target.closest('.tree-item.folder');
      if (folder) {
        folder.classList.remove('drag-over');
      }
    });
    
    document.addEventListener('drop', async (e) => {
      const folder = e.target.closest('.tree-item.folder');
      if (folder && e.dataTransfer.types.includes('Files')) {
        e.preventDefault();
        e.stopPropagation();
        folder.classList.remove('drag-over');
        
        const targetPath = folder.dataset.path;
        const files = this.getFilesFromDrop(e.dataTransfer);
        
        if (files.length > 0) {
          await this.processDroppedFiles(files, targetPath);
        }
      }
    });
  }
  
  getFilesFromDrop(dataTransfer) {
    const files = [];
    
    // Lấy files từ items (hỗ trợ cả files và folders)
    if (dataTransfer.items) {
      for (const item of dataTransfer.items) {
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            files.push(entry);
          }
        }
      }
    }
    
    // Fallback: lấy files trực tiếp
    if (files.length === 0 && dataTransfer.files) {
      for (const file of dataTransfer.files) {
        files.push(file);
      }
    }
    
    return files;
  }
  
  async processDroppedFiles(entries, targetPath = '') {
    // Hiển thị progress
    this.showDropOverlay();
    this.dropProgress.style.display = 'block';
    
    const fileList = [];
    
    // Đệ quy xử lý entries
    for (const entry of entries) {
      await this.traverseFileTree(entry, targetPath, fileList);
    }
    
    // Upload files
    if (fileList.length > 0) {
      await this.uploadFiles(fileList);
    } else {
      this.app.ui.showToast('No files to upload', 'warning');
    }
    
    // Ẩn overlay sau khi hoàn thành
    setTimeout(() => {
      this.hideDropOverlay();
    }, 500);
  }
  
  async traveseFileTree(entry, parentPath, fileList) {
    if (entry.isFile) {
      // Xử lý file
      try {
        const file = await this.entryToFile(entry);
        const path = parentPath ? `${parentPath}/${entry.name}` : entry.name;
        fileList.push({ path, file });
      } catch (error) {
        console.error('Error reading file:', entry.name, error);
      }
    } else if (entry.isDirectory) {
      // Xử lý folder
      const folderPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
      
      try {
        const reader = entry.createReader();
        const entries = await this.readAllEntries(reader);
        
        for (const childEntry of entries) {
          await this.traverseFileTree(childEntry, folderPath, fileList);
        }
      } catch (error) {
        console.error('Error reading directory:', entry.name, error);
      }
    } else if (entry instanceof File) {
      // Xử lý File object trực tiếp
      const path = parentPath ? `${parentPath}/${entry.name}` : entry.name;
      fileList.push({ path, file: entry });
    }
  }
  
  async readAllEntries(reader) {
    const entries = [];
    
    try {
      let batch;
      do {
        batch = await new Promise((resolve, reject) => {
          try {
            reader.readEntries(resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
        entries.push(...batch);
      } while (batch.length > 0);
    } catch (error) {
      console.error('Error reading directory entries:', error);
    }
    
    return entries;
  }
  
  entryToFile(entry) {
    return new Promise((resolve, reject) => {
      entry.file(resolve, reject);
    });
  }
  
  async uploadFiles(files) {
    const total = files.length;
    let uploaded = 0;
    let errors = [];
    
    this.updateProgress(0, `Preparing to upload ${total} files...`);
    
    // Tạo cấu trúc thư mục trước
    const folders = new Set();
    files.forEach(({ path }) => {
      const parts = path.split('/');
      let currentPath = '';
      
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
        folders.add(currentPath);
      }
    });
    
    // Tạo folders
    for (const folderPath of folders) {
      if (!this.app.state.getFile(folderPath)) {
        this.app.state.createFolder(folderPath);
      }
    }
    
    // Upload từng file
    for (const { path, file } of files) {
      try {
        this.updateProgress(
          (uploaded / total) * 100,
          `Uploading ${file.name} (${uploaded + 1}/${total})`
        );
        
        // Đọc nội dung file
        const content = await this.readFileAsText(file);
        
        // Lưu vào state
        this.app.state.createFile(path, content);
        
        uploaded++;
        
        // Cập nhật UI sau mỗi 5 files
        if (uploaded % 5 === 0) {
          this.app.fileSystem.render();
        }
        
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        errors.push({ file: file.name, error: error.message });
      }
    }
    
    // Render lại file tree
    this.app.fileSystem.render();
    
    // Hiển thị kết quả
    if (errors.length > 0) {
      this.app.ui.showToast(
        `Uploaded ${uploaded}/${total} files (${errors.length} errors)`,
        'warning'
      );
      console.error('Upload errors:', errors);
    } else {
      this.app.ui.showToast(
        `Successfully uploaded ${uploaded} ${uploaded === 1 ? 'file' : 'files'}`,
        'success'
      );
    }
    
    // Mở file đầu tiên nếu chưa có file nào mở
    if (!this.app.state.activeFile && uploaded > 0) {
      const firstFile = files.find(f => 
        f.path.endsWith('.html') || 
        f.path.endsWith('.js') || 
        f.path.endsWith('.css')
      );
      
      if (firstFile) {
        this.app.state.openFile(firstFile.path);
      }
    }
    
    // Cập nhật file count
    this.app.updateFileCount();
  }
  
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }
  
  updateProgress(percentage, text) {
    if (this.progressFill) {
      this.progressFill.style.width = `${Math.min(percentage, 100)}%`;
    }
    if (this.progressText) {
      this.progressText.textContent = text;
    }
  }
  
  showDropOverlay() {
    if (this.dropOverlay) {
      this.dropOverlay.style.display = 'flex';
      if (this.dropProgress) {
        this.dropProgress.style.display = 'none';
      }
      if (this.progressFill) {
        this.progressFill.style.width = '0%';
      }
    }
  }
  
  hideDropOverlay() {
    if (this.dropOverlay) {
      this.dropOverlay.style.display = 'none';
    }
  }
}
