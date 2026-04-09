/**
 * CodeSnap Pro - Main Application Entry
 * A production-level Web IDE with file management, console, and live preview
 */

import { AppState } from './core/state.js';
import { CONSTANTS, DEFAULT_FILES } from './core/constants.js';
import { StorageManager } from './utils/storage.js';
import { EditorManager } from './components/Editor.js';
import { PreviewManager } from './components/Preview.js';
import { FileSystemManager } from './components/FileSystem.js';
import { ConsoleManager } from './components/Console.js';
import { UIHelpers } from './utils/helpers.js';

class CodeSnapPro {
  constructor() {
    this.state = new AppState();
    this.storage = new StorageManager();
    this.ui = new UIHelpers();
    
    // Component instances
    this.editor = null;
    this.preview = null;
    this.fileSystem = null;
    this.console = null;
    
    // Split instance
    this.split = null;
    
    this.init();
  }
  
  async init() {
    // Load saved state or defaults
    await this.loadInitialState();
    
    // Initialize components
    this.initializeComponents();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Setup split layout
    this.setupSplitLayout();
    
    // Initial render
    this.render();
    
    // Setup console capture
    this.setupConsoleCapture();
    
    console.log('✅ CodeSnap Pro initialized');
  }
  
  async loadInitialState() {
    // Try to load from localStorage
    const savedState = this.storage.load('codesnap-state');
    
    if (savedState) {
      this.state.files = savedState.files || DEFAULT_FILES;
      this.state.activeFile = savedState.activeFile || 'index.html';
      this.state.theme = savedState.theme || 'dark';
      this.state.layout = savedState.layout || { editor: 50, preview: 50 };
    } else {
      this.state.files = { ...DEFAULT_FILES };
      this.state.activeFile = 'index.html';
      this.state.theme = 'dark';
    }
    
    // Apply theme
    document.body.classList.toggle('theme-light', this.state.theme === 'light');
  }
  
  initializeComponents() {
    // Editor Manager
    this.editor = new EditorManager({
      element: document.getElementById('codeEditor'),
      onChange: (content) => this.handleEditorChange(content),
      onCursorChange: (pos) => this.updateCursorPosition(pos)
    });
    
    // Preview Manager
    this.preview = new PreviewManager({
      iframe: document.getElementById('previewFrame'),
      onError: (error) => this.console.log(error, 'error')
    });
    
    // File System Manager
    this.fileSystem = new FileSystemManager({
      files: this.state.files,
      activeFile: this.state.activeFile,
      onFileChange: (files) => this.handleFileSystemChange(files),
      onFileSelect: (filename) => this.openFile(filename)
    });
    
    // Console Manager
    this.console = new ConsoleManager({
      container: document.getElementById('consoleOutput'),
      maxLines: 100
    });
  }
  
  setupEventListeners() {
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
      this.toggleTheme();
    });
    
    // Download project
    document.getElementById('downloadProject').addEventListener('click', () => {
      this.downloadProject();
    });
    
    // Upload project
    document.getElementById('uploadProject').addEventListener('click', () => {
      document.getElementById('fileUploadInput').click();
    });
    
    document.getElementById('fileUploadInput').addEventListener('change', (e) => {
      this.uploadProject(e.target.files);
    });
    
    // Preview controls
    document.getElementById('refreshPreview').addEventListener('click', () => {
      this.refreshPreview();
    });
    
    document.getElementById('openInNewTab').addEventListener('click', () => {
      this.openPreviewInNewTab();
    });
    
    document.getElementById('toggleFullscreen').addEventListener('click', () => {
      this.toggleFullscreenPreview();
    });
    
    // Activity bar
    document.querySelectorAll('.activity-icon').forEach(icon => {
      icon.addEventListener('click', () => {
        const view = icon.dataset.view;
        this.switchView(view);
      });
    });
    
    // New file
    document.getElementById('newFileBtn').addEventListener('click', () => {
      this.createNewFile();
    });
    
    // Clear console
    document.getElementById('clearConsole').addEventListener('click', () => {
      this.console.clear();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });
    
    // Auto-save periodically
    setInterval(() => this.autoSave(), 30000);
  }
  
  setupSplitLayout() {
    this.split = Split(['#editorPane', '#previewPane'], {
      sizes: [50, 50],
      minSize: [200, 200],
      gutterSize: 6,
      cursor: 'col-resize',
      onDragEnd: () => {
        this.saveLayout();
      }
    });
  }
  
  setupConsoleCapture() {
    // Override console methods in preview
    const originalConsole = window.console;
    
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'console') {
        const { method, args } = event.data;
        this.console.log(args, method);
      }
      
      if (event.data && event.data.type === 'error') {
        this.console.log(event.data.error, 'error');
      }
    });
  }
  
  render() {
    // Render file tree
    this.fileSystem.render();
    
    // Open active file
    this.openFile(this.state.activeFile);
    
    // Update UI
    this.updateUI();
  }
  
  openFile(filename) {
    const content = this.state.files[filename];
    if (content !== undefined) {
      this.editor.setContent(content, filename);
      this.state.activeFile = filename;
      this.fileSystem.setActiveFile(filename);
      this.updateUI();
      
      // Update preview if it's HTML/CSS/JS
      if (this.shouldAutoPreview(filename)) {
        this.preview.update(this.generatePreview());
      }
    }
  }
  
  handleEditorChange(content) {
    // Save to state
    if (this.state.activeFile) {
      this.state.files[this.state.activeFile] = content;
      
      // Update preview for relevant files
      if (this.shouldAutoPreview(this.state.activeFile)) {
        this.preview.update(this.generatePreview());
      }
      
      // Mark as unsaved
      this.state.isDirty = true;
    }
  }
  
  shouldAutoPreview(filename) {
    return CONSTANTS.PREVIEW_EXTENSIONS.some(ext => filename.endsWith(ext));
  }
  
  generatePreview() {
    const html = this.state.files['index.html'] || '';
    const css = this.state.files['style.css'] || '';
    const js = this.state.files['script.js'] || '';
    
    return this.preview.buildPreviewHTML(html, css, js);
  }
  
  handleFileSystemChange(files) {
    this.state.files = files;
    this.updateUI();
    this.refreshPreview();
  }
  
  createNewFile() {
    const filename = prompt('Enter file name (e.g., newfile.js):');
    if (!filename) return;
    
    const ext = filename.split('.').pop();
    const defaultContent = CONSTANTS.DEFAULT_CONTENT[ext] || '';
    
    this.state.files[filename] = defaultContent;
    this.fileSystem.updateFiles(this.state.files);
    this.openFile(filename);
  }
  
  toggleTheme() {
    this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
    document.body.classList.toggle('theme-light', this.state.theme === 'light');
    
    // Update editor theme
    const editorTheme = this.state.theme === 'dark' ? 'dracula' : 'eclipse';
    this.editor.setTheme(editorTheme);
    
    this.updateUI();
  }
  
  switchView(view) {
    const explorerPanel = document.getElementById('explorerPanel');
    const consolePanel = document.getElementById('consolePanel');
    
    if (view === 'console') {
      explorerPanel.style.display = 'none';
      consolePanel.style.display = 'flex';
    } else {
      explorerPanel.style.display = 'block';
      consolePanel.style.display = 'none';
    }
    
    // Update active icon
    document.querySelectorAll('.activity-icon').forEach(icon => {
      icon.classList.toggle('active', icon.dataset.view === view);
    });
  }
  
  refreshPreview() {
    this.preview.update(this.generatePreview());
    this.ui.showToast('Preview refreshed', 'success');
  }
  
  openPreviewInNewTab() {
    const win = window.open('', '_blank');
    const html = this.generatePreview();
    win.document.write(html);
    win.document.close();
  }
  
  toggleFullscreenPreview() {
    const editorPane = document.getElementById('editorPane');
    const previewPane = document.getElementById('previewPane');
    
    if (editorPane.style.display === 'none') {
      editorPane.style.display = 'flex';
      previewPane.style.width = '';
      this.split.setSizes([50, 50]);
    } else {
      editorPane.style.display = 'none';
      previewPane.style.width = '100%';
    }
  }
  
  async downloadProject() {
    const zip = new JSZip();
    
    // Add all files to zip
    Object.entries(this.state.files).forEach(([filename, content]) => {
      zip.file(filename, content);
    });
    
    // Generate zip
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'codesnap-project.zip');
    
    this.ui.showToast('Project downloaded', 'success');
  }
  
  async uploadProject(files) {
    try {
      for (const file of files) {
        const content = await file.text();
        this.state.files[file.name] = content;
      }
      
      this.fileSystem.updateFiles(this.state.files);
      this.openFile(Object.keys(this.state.files)[0]);
      this.ui.showToast('Project uploaded', 'success');
    } catch (error) {
      this.console.log(`Upload error: ${error.message}`, 'error');
    }
  }
  
  handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + S: Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      this.saveState();
    }
    
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
  }
  
  saveState() {
    this.storage.save('codesnap-state', {
      files: this.state.files,
      activeFile: this.state.activeFile,
      theme: this.state.theme,
      layout: this.split.getSizes()
    });
    
    this.state.isDirty = false;
    this.ui.showToast('Project saved', 'success');
  }
  
  autoSave() {
    if (this.state.isDirty) {
      this.saveState();
    }
  }
  
  saveLayout() {
    const sizes = this.split.getSizes();
    this.state.layout = { editor: sizes[0], preview: sizes[1] };
    this.saveState();
  }
  
  updateUI() {
    // Update file info
    document.getElementById('currentFileInfo').textContent = this.state.activeFile;
    
    // Update file count
    const count = Object.keys(this.state.files).length;
    document.getElementById('fileCount').textContent = `${count} file${count !== 1 ? 's' : ''}`;
    
    // Update theme status
    document.getElementById('themeStatus').innerHTML = `
      <i class="fas fa-palette"></i>
      <span>${this.state.theme === 'dark' ? 'Dark' : 'Light'}</span>
    `;
    
    // Update preview status
    const status = document.getElementById('previewStatus');
    status.innerHTML = `
      <i class="fas fa-check-circle" style="color: var(--success);"></i>
      <span>Preview ready</span>
    `;
  }
  
  updateCursorPosition(pos) {
    document.getElementById('cursorPosition').textContent = `Ln ${pos.line}, Col ${pos.ch}`;
  }
  
  showQuickOpen() {
    const files = Object.keys(this.state.files);
    const search = prompt(`Quick open (${files.length} files):`);
    
    if (search) {
      const match = files.find(f => f.toLowerCase().includes(search.toLowerCase()));
      if (match) {
        this.openFile(match);
      }
    }
  }
  
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.style.display = sidebar.style.display === 'none' ? 'flex' : 'none';
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new CodeSnapPro();
});
