/**
 * File System Manager with Tree View
 */

import { CONSTANTS } from '../core/constants.js';

export class FileSystemManager {
  constructor(state, options = {}) {
    this.state = state;
    this.container = document.getElementById('fileTree');
    this.contextMenu = document.getElementById('contextMenu');
    this.selectedPath = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);
    
    // Subscribe to state changes
    this.state.subscribe('fileCreated', () => this.render());
    this.state.subscribe('folderCreated', () => this.render());
    this.state.subscribe('itemDeleted', () => this.render());
    this.state.subscribe('itemRenamed', () => this.render());
    this.state.subscribe('activeFile', () => this.render());
    
    // Setup event listeners
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Context menu
    document.addEventListener('contextmenu', this.handleContextMenu);
    document.addEventListener('click', () => {
      this.contextMenu.style.display = 'none';
    });
    
    // Context menu actions
    this.contextMenu.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action) {
        this.handleContextAction(action);
        this.contextMenu.style.display = 'none';
      }
    });
  }
  
  handleContextMenu(e) {
    const treeItem = e.target.closest('.tree-item');
    if (!treeItem) return;
    
    e.preventDefault();
    
    this.selectedPath = treeItem.dataset.path;
    
    const { clientX, clientY } = e;
    this.contextMenu.style.display = 'block';
    this.contextMenu.style.left = clientX + 'px';
    this.contextMenu.style.top = clientY + 'px';
  }
  
  handleContextAction(action) {
    if (!this.selectedPath) return;
    
    switch (action) {
      case 'newFile':
        this.createNewFile(this.selectedPath);
        break;
      case 'newFolder':
        this.createNewFolder(this.selectedPath);
        break;
      case 'rename':
        this.renameItem(this.selectedPath);
        break;
      case 'delete':
        this.deleteItem(this.selectedPath);
        break;
      case 'download':
        this.downloadItem(this.selectedPath);
        break;
    }
  }
  
  render() {
    this.container.innerHTML = '';
    const tree = this.buildFileTree();
    this.renderTree(tree, this.container);
  }
  
  buildFileTree() {
    const tree = {};
    
    for (const [path, item] of this.state.fileSystem) {
      const parts = path.split('/').filter(p => p);
      let current = tree;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        
        if (!current[part]) {
          current[part] = {
            name: part,
            path: parts.slice(0, i + 1).join('/'),
            type: isLast ? item.type : 'folder',
            children: {},
            item: isLast ? item : null
          };
        }
        
        current = current[part].children;
      }
    }
    
    return tree;
  }
  
  renderTree(tree, container, level = 0) {
    const items = Object.values(tree).sort((a, b) => {
      // Folders first, then files
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    
    items.forEach(item => {
      const element = this.createTreeItem(item, level);
      container.appendChild(element);
      
      if (item.type === 'folder' && Object.keys(item.children).length > 0) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-children';
        this.renderTree(item.children, childrenContainer, level + 1);
        container.appendChild(childrenContainer);
      }
    });
  }
  
  createTreeItem(item, level) {
    const div = document.createElement('div');
    div.className = 'tree-item';
    if (item.type === 'folder') {
      div.classList.add('folder');
    }
    if (item.path === this.state.activeFile) {
      div.classList.add('active');
    }
    div.dataset.path = item.path;
    div.dataset.type = item.type;
    
    const indent = level * 20;
    div.style.paddingLeft = (indent + (item.type === 'folder' ? 8 : 24)) + 'px';
    
    // Icon
    const icon = this.getFileIcon(item);
    
    // Toggle button for folders
    const toggle = item.type === 'folder' ? 
      '<i class="fas fa-chevron-down folder-toggle"></i>' : '';
    
    div.innerHTML = `
      ${toggle}
      <i class="${icon.class} ${item.type === 'folder' ? 'folder-icon' : 'file-icon'}" 
         style="color: ${icon.color}"></i>
      <span class="item-name">${item.name}</span>
      <div class="item-actions">
        <i class="fas fa-plus" data-action="new" title="New item"></i>
      </div>
    `;
    
    // Event listeners
    div.addEventListener('click', (e) => {
      if (e.target.closest('.item-actions')) {
        this.showCreateMenu(item.path, e);
      } else if (e.target.classList.contains('folder-toggle')) {
        this.toggleFolder(div);
      } else {
        this.handleItemClick(item);
      }
    });
    
    div.addEventListener('dblclick', () => {
      if (item.type === 'file') {
        this.state.openFile(item.path);
      }
    });
    
    return div;
  }
  
  getFileIcon(item) {
    if (item.type === 'folder') {
      return { class: 'fas fa-folder', color: 'var(--folder)' };
    }
    
    const ext = item.name.split('.').pop();
    const fileType = CONSTANTS.FILE_TYPES[ext] || CONSTANTS.FILE_TYPES.default;
    
    return { class: fileType.icon, color: fileType.color };
  }
  
  toggleFolder(element) {
    const children = element.nextElementSibling;
    const icon = element.querySelector('.folder-toggle');
    
    if (children) {
      children.classList.toggle('collapsed');
      icon.style.transform = children.classList.contains('collapsed') ? 
        'rotate(-90deg)' : 'rotate(0deg)';
    }
  }
  
  handleItemClick(item) {
    if (item.type === 'folder') {
      const element = document.querySelector(`[data-path="${item.path}"]`);
      if (element) {
        this.toggleFolder(element);
      }
    } else {
      this.state.openFile(item.path);
    }
  }
  
  createNewFile(parentPath) {
    const name = prompt('Enter file name (e.g., newfile.js):');
    if (!name) return;
    
    const path = parentPath ? `${parentPath}/${name}` : name;
    const ext = name.split('.').pop();
    const content = CONSTANTS.DEFAULT_CONTENT[ext] || '';
    
    this.state.createFile(path, content);
    this.state.openFile(path);
  }
  
  createNewFolder(parentPath) {
    const name = prompt('Enter folder name:');
    if (!name) return;
    
    const path = parentPath ? `${parentPath}/${name}` : name;
    this.state.createFolder(path);
  }
  
  renameItem(path) {
    const oldName = path.split('/').pop();
    const newName = prompt('Enter new name:', oldName);
    if (!newName || newName === oldName) return;
    
    const parentPath = path.split('/').slice(0, -1).join('/');
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;
    
    this.state.renameItem(path, newPath);
  }
  
  deleteItem(path) {
    const name = path.split('/').pop();
    if (confirm(`Delete "${name}"?`)) {
      this.state.deleteItem(path);
    }
  }
  
  downloadItem(path) {
    const item = this.state.getFile(path);
    if (item && item.type === 'file') {
      const blob = new Blob([item.content], { type: 'text/plain' });
      const name = path.split('/').pop();
      saveAs(blob, name);
    }
  }
  
  showCreateMenu(parentPath, event) {
    const rect = event.target.getBoundingClientRect();
    this.selectedPath = parentPath;
    
    // Show simplified context menu
    this.contextMenu.innerHTML = `
      <div class="context-item" data-action="newFile">
        <i class="fas fa-file-plus"></i> New File
      </div>
      <div class="context-item" data-action="newFolder">
        <i class="fas fa-folder-plus"></i> New Folder
      </div>
    `;
    
    this.contextMenu.style.display = 'block';
    this.contextMenu.style.left = rect.right + 'px';
    this.contextMenu.style.top = rect.top + 'px';
  }
}
