/**
 * Web IDE Pro - Main Application
 * Nâng cấp với Drag & Drop Manager
 */

import { AppState } from './core/state.js';
import { CONSTANTS, DEFAULT_FILESYSTEM } from './core/constants.js';
import { StorageManager } from './utils/storage.js';
import { EditorManager } from './components/Editor.js';
import { PreviewManager } from './components/Preview.js';
import { FileSystemManager } from './components/FileSystem.js';
import { ConsoleManager } from './components/Console.js';
import { DragDropManager } from './utils/dragDrop.js';
import { UIHelpers } from './utils/helpers.js';

class WebIDEPro {
  constructor() {
    this.state = new AppState();
    this.storage = new StorageManager();
    this.ui = new UIHelpers();
    
    this.editor = null;
    this.preview = null;
    this.fileSystem = null;
    this.console = null;
    this.dragDrop = null;
    this.split = null;
    
    this.init();
  }
  
  async init() {
    // Load saved state
    await this.loadState();
    
    // Initialize components
    this.initializeComponents();
    
    // Setup split layout
    this.setupSplitLayout();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Setup drag & drop
    this.dragDrop = new DragDropManager(this);
    
    // Setup console capture
    this.setupConsoleCapture();
    
    // Initial render
    this.render();
    
    // Welcome message
    this.showWelcomeMessage();
    
    console.log('✅ Web IDE Pro initialized with Drag & Drop support');
  }
  
  async loadState() {
    const saved = this.storage.load(CONSTANTS.STORAGE_KEYS.FILE_SYSTEM);
    
    if (saved && saved.fileSystem) {
      this.state.import(saved);
    } else {
      // Load default files
      Object.entries(DEFAULT_FILESYSTEM).forEach(([path, file]) => {
        this.state._state.fileSystem.set(path, file);
      });
      this.state.openFile('index.html');
    }
    
    // Load settings
    const settings = this.storage.load(CONSTANTS.STORAGE_KEYS.SETTINGS) || {};
    this.state.theme = settings.theme || 'dark';
    document.body.classList.toggle('theme-light', this.state.theme === 'light');
  }
  
  initializeComponents() {
    // Editor
    this.editor = new EditorManager(this.state);
    
    // Preview
    this.preview = new PreviewManager(this.state);
    
    // File System
    this.fileSystem = new FileSystemManager(this.state);
    
    // Console
    this.console = new ConsoleManager(this.state);
  }
  
  setupSplitLayout() {
    this.split = Split(['#editorPane', '#previewPane'], {
      sizes: [50, 50],
      minSize: [200, 200],
      gutterSize: 6,
      cursor: 'col-resize'
    });
  }
  
  setupEventListeners() {
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
      this.toggleTheme();
    });
    
    // Upload buttons
    document.getElementById('uploadBtn').addEventListener('click', () => {
      document.getElementById('fileInput').click();
    });
    
    document.getElementById('uploadFolderBtn').addEventListener('click', () => {
      document.getElementById('folderInput').click();
    });
    
    document.getElementById('fileInput').addEventListener('change', (e) => {
      this.handleFileUpload(e.target.files);
      e.target.value = ''; // Reset input
    });
    
    document.getElementById('folderInput').addEventListener('change', (e) => {
      this.handleFolderUpload(e.target.files);
      e.target.value = ''; // Reset input
    });
    
    // Download project
    document.getElementById('downloadProject').addEventListener('click', () => {
      this.downloadProject();
    });
    
    // New file/folder buttons
    document.getElementById('newFileBtn').addEventListener('click', () => {
      this.fileSystem.createNewFile('');
    });
    
    document.getElementById('newFolderBtn').addEventListener('click', () => {
      this.fileSystem.createNewFolder('');
    });
    
    // Refresh explorer
    document.getElementById('refreshExplorer').addEventListener('click', () => {
      this.fileSystem.render();
      this.ui.showToast('Explorer refreshed', 'info');
    });
    
    // Activity bar
    document.querySelectorAll('.activity-icon').forEach(icon => {
      icon.addEventListener('click', () => {
        this.switchView(icon.dataset.view);
      });
    });
    
    // Preview controls
    document.getElementById('refreshPreview').addEventListener('click', () => {
      this.preview.refresh();
      this.ui.showToast('Preview refreshed', 'success');
    });
    
    document.getElementById('openInNewTab').addEventListener('click', () => {
      this.preview.openInNewTab();
    });
    
    document.getElementById('toggleFullscreen').addEventListener('click', () => {
      this.toggleFullscreen();
    });
    
    // Console controls
    document.getElementById('clearConsole').addEventListener('click', () => {
      this.console.clear();
    });
    
    document.getElementById('consoleFilter').addEventListener('change', (e) => {
      this.console.filter(e.target.value);
    });
    
    // Workspace collapse/expand
    document.getElementById('workspaceInfo').addEventListener('click', () => {
      const fileTree = document.getElementById('fileTree');
      const icon = document.querySelector('#workspaceInfo i');
      
      if (fileTree.style.display === 'none') {
        fileTree.style.display = 'block';
        icon.style.transform = 'rotate(0deg)';
      } else {
        fileTree.style.display = 'none';
        icon.style.transform = 'rotate(-90deg)';
      }
    });
    
    // Auto-save
    window.addEventListener('beforeunload', () => {
      this.saveState();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });
  }
  
  setupConsoleCapture() {
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'console') {
        this.console.log(event.data.method, event.data.args);
      }
      
      if (event.data && event.data.type === 'error') {
        this.console.log('error', [event.data.error]);
      }
    });
  }
  
  async handleFileUpload(files) {
    const fileArray = Array.from(files);
    const uploadFiles = fileArray.map(file => ({
      path: file.name,
      file: file
    }));
    
    await this.dragDrop.uploadFiles(uploadFiles, '');
  }
  
  async handleFolderUpload(files) {
    // Group files by folder structure
    const fileMap = new Map();
    
    for (const file of files) {
      const path = file.webkitRelativePath;
      fileMap.set(path, file);
    }
    
    const uploadFiles = Array.from(fileMap.entries()).map(([path, file]) => ({
      path,
      file
    }));
    
    await this.dragDrop.uploadFiles(uploadFiles, '');
  }
  
  render() {
    this.fileSystem.render();
    this.editor.updateTabs();
    this.updateFileCount();
  }
  
  updateFileCount() {
    let count = 0;
    for (const [_, item] of this.state.fileSystem) {
      if (item.type === 'file') count++;
    }
    document.getElementById('fileCount').textContent = `${count} file${count !== 1 ? 's' : ''}`;
  }
  
  toggleTheme() {
    this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
    document.body.classList.toggle('theme-light', this.state.theme === 'light');
    this.editor.setTheme(this.state.theme);
    
    const themeIcon = document.querySelector('#themeToggle');
    themeIcon.className = this.state.theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    
    document.getElementById('themeStatus').textContent = 
      this.state.theme === 'dark' ? 'Dark' : 'Light';
    
    this.saveState();
  }
  
  switchView(view) {
    const explorer = document.getElementById('explorerPanel');
    const console = document.getElementById('consolePanel');
    
    explorer.style.display = view === 'console' ? 'none' : 'block';
    console.style.display = view === 'console' ? 'flex' : 'none';
    
    document.querySelectorAll('.activity-icon').forEach(icon => {
      icon.classList.toggle('active', icon.dataset.view === view);
    });
  }
  
  toggleFullscreen() {
    const editor = document.getElementById('editorPane');
    const preview = document.getElementById('previewPane');
    const icon = document.querySelector('#toggleFullscreen');
    
    if (editor.style.display === 'none') {
      editor.style.display = 'flex';
      preview.style.width = '';
      this.split.setSizes([50, 50]);
      icon.className = 'fas fa-expand';
    } else {
      editor.style.display = 'none';
      preview.style.width = '100%';
      icon.className = 'fas fa-compress';
    }
  }
  
  async downloadProject() {
    try {
      const zip = new JSZip();
      
      for (const [path, item] of this.state.fileSystem) {
        if (item.type === 'file') {
          zip.file(path, item.content);
        }
      }
      
      const blob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      const timestamp = new Date().toISOString().split('T')[0];
      saveAs(blob, `webide-project-${timestamp}.zip`);
      
      this.ui.showToast('Project downloaded successfully', 'success');
    } catch (error) {
      this.ui.showToast('Failed to download project', 'error');
    }
  }
  
  saveState() {
    const data = this.state.export();
    this.storage.save(CONSTANTS.STORAGE_KEYS.FILE_SYSTEM, data);
    
    const settings = {
      theme: this.state.theme,
      autoSave: this.state._state.autoSave
    };
    this.storage.save(CONSTANTS.STORAGE_KEYS.SETTINGS, settings);
  }
  
  handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + P: Quick open
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      this.showQuickOpen();
    }
    
    // Ctrl/Cmd + B: Toggle sidebar
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      this.toggleSidebar();
    }
    
    // Ctrl/Cmd + Shift + F: Format code
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      this.editor.format();
    }
  }
  
  showQuickOpen() {
    const files = Array.from(this.state.fileSystem.keys())
      .filter(path => this.state.getFile(path)?.type === 'file');
    
    const search = prompt(`Quick open (${files.length} files):`);
    if (!search) return;
    
    const matches = files.filter(f => 
      f.toLowerCase().includes(search.toLowerCase())
    );
    
    if (matches.length === 1) {
      this.state.openFile(matches[0]);
    } else if (matches.length > 1) {
      // Show simple selection
      const selected = prompt(`Multiple matches:\n${matches.join('\n')}\n\nEnter exact path:`);
      if (selected && matches.includes(selected)) {
        this.state.openFile(selected);
      }
    }
  }
  
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.style.display = sidebar.style.display === 'none' ? 'flex' : 'none';
  }
  
  showWelcomeMessage() {
    setTimeout(() => {
      this.ui.showToast(
        '👋 Drag & drop files or folders anywhere to upload',
        'info',
        5000
      );
    }, 1000);
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  window.app = new WebIDEPro();
});
