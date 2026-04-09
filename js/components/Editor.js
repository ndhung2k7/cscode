/**
 * Editor Manager with multi-tab support
 */

import { CONSTANTS } from '../core/constants.js';

export class EditorManager {
  constructor(state, options = {}) {
    this.state = state;
    this.element = document.getElementById('codeEditor');
    this.tabsContainer = document.getElementById('editorTabs');
    this.instance = null;
    this.currentFile = null;
    this.autoSaveTimer = null;
    
    this.init();
    this.setupStateListeners();
  }
  
  init() {
    this.instance = CodeMirror.fromTextArea(this.element, {
      mode: 'htmlmixed',
      theme: 'dracula',
      lineNumbers: true,
      lineWrapping: true,
      tabSize: 2,
      indentUnit: 2,
      autoCloseTags: true,
      autoCloseBrackets: true,
      matchBrackets: true,
      foldGutter: true,
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
      extraKeys: {
        'Cmd-S': () => this.saveFile(),
        'Ctrl-S': () => this.saveFile(),
        'Cmd-Z': () => this.state.undo(),
        'Cmd-Shift-Z': () => this.state.redo()
      }
    });
    
    this.instance.setSize('100%', '100%');
    
    // Editor events
    this.instance.on('change', () => {
      this.handleContentChange();
    });
    
    this.instance.on('cursorActivity', () => {
      const cursor = this.instance.getCursor();
      this.state._state.cursorPosition = { line: cursor.line + 1, col: cursor.ch + 1 };
      this.updateCursorDisplay();
    });
  }
  
  setupStateListeners() {
    this.state.subscribe('activeFile', (path) => {
      this.openFile(path);
    });
    
    this.state.subscribe('fileClosed', (path) => {
      this.updateTabs();
      if (this.currentFile === path) {
        const activeFile = this.state.activeFile;
        if (activeFile) {
          this.openFile(activeFile);
        } else {
          this.clearEditor();
        }
      }
    });
    
    this.state.subscribe('fileChanged', ({ path, content }) => {
      if (path === this.currentFile) {
        this.instance.setValue(content);
      }
    });
  }
  
  openFile(path) {
    if (!path) return;
    
    // Save current file before switching
    if (this.currentFile) {
      this.saveCurrentFile();
    }
    
    const file = this.state.getFile(path);
    if (!file || file.type !== 'file') return;
    
    this.currentFile = path;
    this.instance.setValue(file.content);
    
    // Update mode based on file extension
    const ext = path.split('.').pop();
    const fileType = CONSTANTS.FILE_TYPES[ext] || CONSTANTS.FILE_TYPES.default;
    this.instance.setOption('mode', fileType.mode);
    
    // Update UI
    this.updateTabs();
    this.updateFileInfo();
    this.instance.focus();
  }
  
  saveCurrentFile() {
    if (this.currentFile) {
      const content = this.instance.getValue();
      this.state.setFile(this.currentFile, content);
    }
  }
  
  saveFile() {
    this.saveCurrentFile();
    this.showSaveIndicator();
  }
  
  handleContentChange() {
    if (!this.currentFile) return;
    
    // Auto-save with debounce
    clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      this.saveCurrentFile();
    }, CONSTANTS.AUTO_SAVE_INTERVAL);
    
    // Update preview if needed
    this.state.notify('editorChanged', {
      path: this.currentFile,
      content: this.instance.getValue()
    });
  }
  
  updateTabs() {
    const openFiles = this.state.openFiles;
    
    this.tabsContainer.innerHTML = '';
    
    openFiles.forEach(path => {
      const tab = this.createTab(path);
      this.tabsContainer.appendChild(tab);
    });
  }
  
  createTab(path) {
    const div = document.createElement('div');
    div.className = 'tab';
    if (path === this.currentFile) {
      div.classList.add('active');
    }
    
    const name = path.split('/').pop();
    const icon = this.getFileIcon(name);
    
    div.innerHTML = `
      <i class="${icon}"></i>
      <span>${name}</span>
      <i class="fas fa-times tab-close" data-action="close"></i>
    `;
    
    div.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-close')) {
        e.stopPropagation();
        this.state.closeFile(path);
      } else {
        this.state.activeFile = path;
      }
    });
    
    return div;
  }
  
  getFileIcon(filename) {
    const ext = filename.split('.').pop();
    const fileType = CONSTANTS.FILE_TYPES[ext] || CONSTANTS.FILE_TYPES.default;
    return fileType.icon;
  }
  
  updateFileInfo() {
    const info = document.querySelector('#fileInfo span');
    if (info) {
      info.textContent = this.currentFile || 'No file open';
    }
  }
  
  updateCursorDisplay() {
    const pos = this.state._state.cursorPosition;
    const display = document.getElementById('cursorPosition');
    if (display) {
      display.textContent = `Ln ${pos.line}, Col ${pos.col}`;
    }
  }
  
  clearEditor() {
    this.currentFile = null;
    this.instance.setValue('');
    this.updateFileInfo();
  }
  
  showSaveIndicator() {
    const status = document.getElementById('previewStatus');
    const original = status.innerHTML;
    status.innerHTML = '<i class="fas fa-check-circle"></i><span>Saved</span>';
    setTimeout(() => {
      status.innerHTML = original;
    }, 1000);
  }
  
  setTheme(theme) {
    const themeName = theme === 'dark' ? 'dracula' : 'eclipse';
    this.instance.setOption('theme', themeName);
  }
}
