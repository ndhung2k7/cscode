/**
 * Web IDE Pro - Main Application
 */

import { AppState } from './core/state.js';
import { CONSTANTS, DEFAULT_FILESYSTEM } from './core/constants.js';
import { StorageManager } from './utils/storage.js';
import { EditorManager } from './components/Editor.js';
import { PreviewManager } from './components/Preview.js';
import { FileSystemManager } from './components/FileSystem.js';
import { ConsoleManager } from './components/Console.js';
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
    this.setupDragAndDrop();
    
    // Initial render
    this.render();
    
    console.log('✅ Web IDE Pro initialized');
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
    
    // Setup console capture from preview
    this.setupConsoleCapture();
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
    });
    
    document.getElementById('folderInput').addEventListener('change', (e) => {
      this.handleFolderUpload(e.target.files);
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
    
    // Activity bar
    document.querySelectorAll('.activity-icon').forEach(icon => {
      icon.addEventListener('click', () => {
        this.switchView(icon.dataset.view);
      });
    });
    
    // Preview controls
    document.getElementById('refreshPreview').addEventListener('click', () => {
      this.preview.refresh();
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
    
    // Auto-save
    window.addEventListener('beforeunload', () => {
      this.saveState();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        this.showQuickOpen();
      }
    });
  }
  
  setupDragAndDrop() {
    const dropZone = document.body;
    
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      
      const items = e.dataTransfer.items;
      await this.handleDrop(items);
    });
  }
  
  async handleDrop(items) {
    const files = [];
    
    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        await this.traverseFileTree(entry, '', files);
      }
    }
    
    this.processUploadedFiles(files);
  }
  
  async traveseFileTree(entry, path, files) {
    if (entry.isFile) {
      const file = await this.entryToFile(entry);
      files.push({ path: path + entry.name, file });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const entries = await this.readAllEntries(reader);
      
      for (const childEntry of entries) {
        await this.traverseFileTree(childEntry, path + entry.name + '/', files);
      }
    }
  }
  
  async readAllEntries(reader) {
    const entries = [];
    let batch;
    
    do {
      batch = await new Promise((resolve) => reader.readEntries(resolve));
      entries.push(...batch);
    } while (batch.length > 0);
    
    return entries;
  }
  
  async entryToFile(entry) {
    return new Promise((resolve) => {
      entry.file(resolve);
    });
  }
  
  async handleFileUpload(files) {
    const fileList = Array.from(files).map(file => ({
      path: file.webkitRelativePath || file.name,
      file
    }));
    
    this.processUploadedFiles(fileList);
  }
  
  async handleFolderUpload(files) {
    this.handleFileUpload(files);
  }
  
  async processUploadedFiles(files) {
    for (const { path, file } of files) {
      const content = await file.text();
      
      // Create folders if needed
      const parts = path.split('/');
      let currentPath = '';
      
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath += (currentPath ? '/' : '') + parts[i];
        if (!this.state.getFile(currentPath)) {
          this.state.createFolder(currentPath);
        }
      }
      
      this.state.createFile(path, content);
    }
    
    this.ui.showToast(`Uploaded ${files.length} files`, 'success');
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
  
  render() {
    this.fileSystem.render();
    this.editor.updateTabs();
  }
  
  toggleTheme() {
    this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
    document.body.classList.toggle('theme-light', this.state.theme === 'light');
    this.editor.setTheme(this.state.theme);
    
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
    
    if (editor.style.display === 'none') {
      editor.style.display = 'flex';
      preview.style.width = '';
      this.split.setSizes([50, 50]);
    } else {
      editor.style.display = 'none';
      preview.style.width = '100%';
    }
  }
  
  async downloadProject() {
    const zip = new JSZip();
    
    for (const [path, item] of this.state.fileSystem) {
      if (item.type === 'file') {
        zip.file(path, item.content);
      }
    }
    
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'webide-project.zip');
    
    this.ui.showToast('Project downloaded', 'success');
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
  
  showQuickOpen() {
    const files = Array.from(this.state.fileSystem.keys())
      .filter(path => this.state.getFile(path)?.type === 'file');
    
    const search = prompt(`Quick open (${files.length} files):`);
    if (!search) return;
    
    const match = files.find(f => 
      f.toLowerCase().includes(search.toLowerCase())
    );
    
    if (match) {
      this.state.openFile(match);
    }
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  window.app = new WebIDEPro();
});
