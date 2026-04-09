/**
 * Centralized State Management
 * Manages file system, editor state, and UI state
 */

export class AppState {
  constructor() {
    this._state = {
      // File system
      fileSystem: new Map(),
      openFiles: new Set(),
      activeFile: null,
      
      // UI state
      theme: 'dark',
      sidebarCollapsed: false,
      explorerExpanded: new Set(['/']),
      
      // Editor state
      editorContent: '',
      cursorPosition: { line: 1, col: 1 },
      
      // Preview state
      previewReady: false,
      consoleMessages: [],
      
      // Settings
      autoSave: true,
      autoPreview: true
    };
    
    this._observers = new Map();
    this._history = [];
    this._historyIndex = -1;
  }
  
  // Getters and Setters
  get fileSystem() {
    return this._state.fileSystem;
  }
  
  get activeFile() {
    return this._state.activeFile;
  }
  
  set activeFile(path) {
    this._state.activeFile = path;
    this.notify('activeFile', path);
  }
  
  get openFiles() {
    return Array.from(this._state.openFiles);
  }
  
  get theme() {
    return this._state.theme;
  }
  
  set theme(value) {
    this._state.theme = value;
    this.notify('theme', value);
  }
  
  // File operations
  getFile(path) {
    return this._state.fileSystem.get(path);
  }
  
  setFile(path, content) {
    const file = this._state.fileSystem.get(path);
    if (file && file.type === 'file') {
      file.content = content;
      file.modified = Date.now();
      this._state.fileSystem.set(path, file);
      this.notify('fileChanged', { path, content });
      this.saveToHistory();
    }
  }
  
  createFile(path, content = '') {
    const file = {
      type: 'file',
      content: content,
      created: Date.now(),
      modified: Date.now()
    };
    this._state.fileSystem.set(path, file);
    this.notify('fileCreated', { path, file });
    this.saveToHistory();
  }
  
  createFolder(path) {
    const folder = {
      type: 'folder',
      created: Date.now(),
      children: new Set()
    };
    this._state.fileSystem.set(path, folder);
    this.notify('folderCreated', { path, folder });
    this.saveToHistory();
  }
  
  deleteItem(path) {
    // Delete item and all children
    for (const [key] of this._state.fileSystem) {
      if (key === path || key.startsWith(path + '/')) {
        this._state.fileSystem.delete(key);
      }
    }
    
    // Remove from open files
    this._state.openFiles.delete(path);
    
    // Clear active file if deleted
    if (this._state.activeFile === path) {
      this._state.activeFile = null;
    }
    
    this.notify('itemDeleted', path);
    this.saveToHistory();
  }
  
  renameItem(oldPath, newPath) {
    const item = this._state.fileSystem.get(oldPath);
    if (!item) return false;
    
    // Rename item and all children
    const itemsToRename = [];
    for (const [key, value] of this._state.fileSystem) {
      if (key === oldPath) {
        itemsToRename.push({ oldKey: key, newKey: newPath, value });
      } else if (key.startsWith(oldPath + '/')) {
        const newKey = key.replace(oldPath, newPath);
        itemsToRename.push({ oldKey: key, newKey: newKey, value });
      }
    }
    
    // Apply renames
    itemsToRename.forEach(({ oldKey, newKey, value }) => {
      this._state.fileSystem.delete(oldKey);
      this._state.fileSystem.set(newKey, value);
    });
    
    // Update open files
    if (this._state.openFiles.has(oldPath)) {
      this._state.openFiles.delete(oldPath);
      this._state.openFiles.add(newPath);
    }
    
    // Update active file
    if (this._state.activeFile === oldPath) {
      this._state.activeFile = newPath;
    }
    
    this.notify('itemRenamed', { oldPath, newPath });
    this.saveToHistory();
    return true;
  }
  
  openFile(path) {
    const file = this._state.fileSystem.get(path);
    if (file && file.type === 'file') {
      this._state.openFiles.add(path);
      this.activeFile = path;
      this.notify('fileOpened', path);
    }
  }
  
  closeFile(path) {
    this._state.openFiles.delete(path);
    
    if (this._state.activeFile === path) {
      const openFiles = Array.from(this._state.openFiles);
      this.activeFile = openFiles.length > 0 ? openFiles[openFiles.length - 1] : null;
    }
    
    this.notify('fileClosed', path);
  }
  
  // History management for undo/redo
  saveToHistory() {
    const state = this.export();
    this._history = this._history.slice(0, this._historyIndex + 1);
    this._history.push(state);
    this._historyIndex++;
    
    // Limit history size
    if (this._history.length > 100) {
      this._history.shift();
      this._historyIndex--;
    }
  }
  
  undo() {
    if (this._historyIndex > 0) {
      this._historyIndex--;
      this.import(this._history[this._historyIndex]);
    }
  }
  
  redo() {
    if (this._historyIndex < this._history.length - 1) {
      this._historyIndex++;
      this.import(this._history[this._historyIndex]);
    }
  }
  
  // Observer pattern
  subscribe(event, callback) {
    if (!this._observers.has(event)) {
      this._observers.set(event, new Set());
    }
    this._observers.get(event).add(callback);
    
    // Return unsubscribe function
    return () => {
      this._observers.get(event)?.delete(callback);
    };
  }
  
  notify(event, data) {
    if (this._observers.has(event)) {
      this._observers.get(event).forEach(callback => callback(data));
    }
  }
  
  // Serialization
  export() {
    return {
      fileSystem: Array.from(this._state.fileSystem.entries()),
      openFiles: Array.from(this._state.openFiles),
      activeFile: this._state.activeFile,
      theme: this._state.theme,
      version: CONSTANTS.VERSION
    };
  }
  
  import(data) {
    if (!data) return;
    
    this._state.fileSystem = new Map(data.fileSystem);
    this._state.openFiles = new Set(data.openFiles);
    this._state.activeFile = data.activeFile;
    this._state.theme = data.theme || 'dark';
    
    this.notify('stateImported', data);
  }
}
