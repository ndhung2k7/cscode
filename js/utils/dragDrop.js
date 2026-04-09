/**
 * Drag & Drop Manager - Xử lý kéo thả files và folders
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
    const dropZones = [document.body, this.dropOverlay];
    
    dropZones.forEach(zone => {
      // Prevent default drag behaviors
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        zone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
      });
    });
    
    // Track drag enter/leave for overlay
    document.body.addEventListener('dragenter', (e) => {
      this.dragCounter++;
      if (!this.isDragging) {
        this.showDropOverlay();
        this.isDragging = true;
      }
    });
    
    document.body.addEventListener('dragleave', (e) => {
      this.dragCounter--;
      if (this.dragCounter === 0) {
        this.hideDropOverlay();
        this.isDragging = false;
      }
    });
    
    // Handle drop
    document.body.addEventListener('drop', async (e) => {
      this.dragCounter = 0;
      this.hideDropOverlay();
      this.isDragging = false;
      
      const items = e.dataTransfer.items;
      if (items) {
        await this.handleDrop(items);
      }
    });
    
    // Also handle drop on overlay
    this.dropOverlay.addEventListener('drop', async (e) => {
      const items = e.dataTransfer.items;
      if (items) {
        await this.handleDrop(items);
      }
    });
  }
  
  setupFileTreeDragDrop() {
    // Allow dropping into specific folders
    document.addEventListener('dragover', (e) => {
      const folder = e.target.closest('.tree-item.folder');
      if (folder) {
        e.preventDefault();
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
      if (folder) {
        e.preventDefault();
        e.stopPropagation();
        folder.classList.remove('drag-over');
        
        const targetPath = folder.dataset.path;
        const items = e.dataTransfer.items;
        
        if (items) {
          await this.handleDrop(items, targetPath);
        }
      }
    });
  }
  
  showDropOverlay() {
    this.dropOverlay.style.display = 'flex';
    this.dropProgress.style.display = 'none';
    this.progressFill.style.width = '0%';
  }
  
  hideDropOverlay() {
    this.dropOverlay.style.display = 'none';
  }
  
  async handleDrop(items, targetPath = '') {
    const entries = [];
    
    // Convert items to entries
    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          entries.push(entry);
        }
      }
    }
    
    if (entries.length === 0) return;
    
    // Show progress
    this.dropProgress.style.display = 'block';
    
    // Collect all files
    const files = [];
    let totalFiles = 0;
    
    // First pass: count total files
    for (const entry of entries) {
      totalFiles += await this.countFiles(entry);
    }
    
    let processedFiles = 0;
    
    // Second pass: process files
    for (const entry of entries) {
      await this.processEntry(entry, targetPath, files, (progress) => {
        processedFiles++;
        const percentage = (processedFiles / totalFiles) * 100;
        this.updateProgress(percentage, `Processing ${processedFiles}/${totalFiles} files...`);
      });
    }
    
    // Upload files
    await this.uploadFiles(files, targetPath);
    
    // Hide overlay after short delay
    setTimeout(() => {
      this.hideDropOverlay();
    }, 500);
  }
  
  async countFiles(entry) {
    if (entry.isFile) {
      return 1;
    } else if (entry.isDirectory) {
      let count = 0;
      const reader = entry.createReader();
      const entries = await this.readAllEntries(reader);
      
      for (const childEntry of entries) {
        count += await this.countFiles(childEntry);
      }
      
      return count;
    }
    return 0;
  }
  
  async processEntry(entry, parentPath, files, onProgress) {
    if (entry.isFile) {
      const file = await this.entryToFile(entry);
      const path = parentPath ? `${parentPath}/${entry.name}` : entry.name;
      files.push({ path, file });
      onProgress();
    } else if (entry.isDirectory) {
      const folderPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
      const reader = entry.createReader();
      const entries = await this.readAllEntries(reader);
      
      for (const childEntry of entries) {
        await this.processEntry(childEntry, folderPath, files, onProgress);
      }
    }
  }
  
  async readAllEntries(reader) {
    const entries = [];
    let batch;
    
    do {
      batch = await new Promise((resolve) => {
        reader.readEntries((results) => resolve(results));
      });
      entries.push(...batch);
    } while (batch.length > 0);
    
    return entries;
  }
  
  entryToFile(entry) {
    return new Promise((resolve) => {
      entry.file((file) => resolve(file));
    });
  }
  
  async uploadFiles(files, targetPath) {
    const total = files.length;
    let uploaded = 0;
    const errors = [];
    
    // Create folder structure first
    const folders = new Set();
    files.forEach(({ path }) => {
      const parts = path.split('/');
      let currentPath = targetPath || '';
      
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
        folders.add(currentPath);
      }
    });
    
    // Create folders
    for (const folderPath of folders) {
      if (!this.app.state.getFile(folderPath)) {
        this.app.state.createFolder(folderPath);
      }
    }
    
    // Upload files with progress
    for (const { path: relativePath, file } of files) {
      try {
        const content = await file.text();
        const fullPath = targetPath ? `${targetPath}/${relativePath}` : relativePath;
        
        this.app.state.createFile(fullPath, content);
        
        uploaded++;
        const percentage = (uploaded / total) * 100;
        this.updateProgress(percentage, `Uploading ${uploaded}/${total} files...`);
        
        // Update file tree
        this.app.fileSystem.render();
        
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        errors.push({ file: file.name, error: error.message });
      }
    }
    
    // Show result
    if (errors.length > 0) {
      this.app.ui.showToast(
        `Uploaded ${uploaded} files with ${errors.length} errors`,
        'warning'
      );
    } else {
      this.app.ui.showToast(
        `Successfully uploaded ${uploaded} files`,
        'success'
      );
    }
    
    // Open first file if no file is open
    if (!this.app.state.activeFile && files.length > 0) {
      const firstFile = files.find(f => f.path.endsWith('.html') || f.path.endsWith('.js') || f.path.endsWith('.css'));
      if (firstFile) {
        const fullPath = targetPath ? `${targetPath}/${firstFile.path}` : firstFile.path;
        this.app.state.openFile(fullPath);
      }
    }
    
    // Update preview
    this.app.preview.update();
  }
  
  updateProgress(percentage, text) {
    this.progressFill.style.width = `${percentage}%`;
    this.progressText.textContent = text;
  }
  
  // Drag out of window
  handleDragEnd() {
    this.dragCounter = 0;
    this.hideDropOverlay();
    this.isDragging = false;
  }
}
