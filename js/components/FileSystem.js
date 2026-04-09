/**
 * File System Manager - Handles file operations and UI
 */

import { CONSTANTS } from '../core/constants.js';

export class FileSystemManager {
  constructor(options) {
    this.files = options.files || {};
    this.activeFile = options.activeFile || '';
    this.onFileChange = options.onFileChange || (() => {});
    this.onFileSelect = options.onFileSelect || (() => {});
    
    this.container = document.getElementById('fileTree');
    this.render();
  }
  
  render() {
    this.container.innerHTML = '';
    
    const files = Object.keys(this.files).sort();
    
    files.forEach(filename => {
      const item = this.createFileItem(filename);
      this.container.appendChild(item);
    });
  }
  
  createFileItem(filename) {
    const div = document.createElement('div');
    div.className = 'file-tree-item';
    if (filename === this.activeFile) {
      div.classList.add('active');
    }
    
    const ext = '.' + filename.split('.').pop();
    const icon = CONSTANTS.FILE_ICONS[ext] || CONSTANTS.FILE_ICONS.default;
    
    div.innerHTML = `
      <i class="${icon}"></i>
      <span class="file-name">${filename}</span>
      <div class="file-actions">
        <i class="fas fa-edit" data-action="rename" title="Rename"></i>
        <i class="fas fa-trash" data-action="delete" title="Delete"></i>
        <i class="fas fa-download" data-action="download" title="Download"></i>
      </div>
    `;
    
    // Event listeners
    div.addEventListener('click', (e) => {
      if (!e.target.closest('.file-actions')) {
        this.onFileSelect(filename);
      }
    });
    
    div.querySelector('[data-action="rename"]').addEventListener('click', (e) => {
      e.stopPropagation();
      this.renameFile(filename);
    });
    
    div.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteFile(filename);
    });
    
    div.querySelector('[data-action="download"]').addEventListener('click', (e) => {
      e.stopPropagation();
      this.downloadFile(filename);
    });
    
    return div;
  }
  
  setActiveFile(filename) {
    this.activeFile = filename;
    this.render();
  }
  
  updateFiles(files) {
    this.files = files;
    this.render();
    this.onFileChange(files);
  }
  
  createFile(name, content = '') {
    if (this.files[name]) {
      alert('File already exists!');
      return false;
    }
    
    this.files[name] = content;
    this.updateFiles(this.files);
    return true;
  }
  
  renameFile(oldName) {
    const newName = prompt('Enter new name:', oldName);
    if (!newName || newName === oldName) return;
    
    if (this.files[newName]) {
      alert('File already exists!');
      return;
    }
    
    this.files[newName] = this.files[oldName];
    delete this.files[oldName];
    
    if (this.activeFile === oldName) {
      this.activeFile = newName;
    }
    
    this.updateFiles(this.files);
  }
  
  deleteFile(filename) {
    if (!confirm(`Delete ${filename}?`)) return;
    
    delete this.files[filename];
    
    if (this.activeFile === filename) {
      const files = Object.keys(this.files);
      this.activeFile = files.length > 0 ? files[0] : '';
    }
    
    this.updateFiles(this.files);
  }
  
  downloadFile(filename) {
    const content = this.files[filename];
    const blob = new Blob([content], { type: 'text/plain' });
    saveAs(blob, filename);
  }
}
